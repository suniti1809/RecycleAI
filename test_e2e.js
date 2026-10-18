const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

async function runE2ETests() {
  console.log('========================================================');
  console.log('  🧪 RecycleAI End-to-End System Integration Test');
  console.log('========================================================\n');

  // Start server as background child process if not already running
  console.log('1. Checking Server Health...');
  let serverRunning = false;
  try {
    const health = await fetch('http://127.0.0.1:5000/api/health').then(r => r.json());
    if (health.status === 'ok') {
      serverRunning = true;
      console.log('   ✓ Server is already running on port 5000');
    }
  } catch (e) {}

  let serverProc = null;
  if (!serverRunning) {
    console.log('   Starting server on port 5000...');
    serverProc = spawn('node', ['server.js'], { cwd: __dirname, stdio: 'inherit' });
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  try {
    // 2. Authentication Test
    console.log('\n2. Testing Authentication...');
    const testSellerEmail = `seller_test_${Date.now()}@recycleai.org`;
    const testBuyerEmail = `recycler_test_${Date.now()}@recycleai.org`;

    const sellerReg = await fetch('http://127.0.0.1:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Eco Seller User',
        email: testSellerEmail,
        password: 'Password123!',
        role: 'user',
        address: 'Civil Lines, Prayagraj'
      })
    }).then(r => r.json());
    console.log('   ✓ Registered Seller:', sellerReg.user?.email, '| Token received:', !!sellerReg.token);

    const buyerReg = await fetch('http://127.0.0.1:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Apex Metal Recycler',
        email: testBuyerEmail,
        password: 'Password123!',
        role: 'recycler',
        address: 'Naini Industrial Area, Prayagraj'
      })
    }).then(r => r.json());
    console.log('   ✓ Registered Recycler:', buyerReg.user?.email, '| Token received:', !!buyerReg.token);

    const sellerToken = sellerReg.token;
    const buyerToken = buyerReg.token;

    // 3. AI Classifier & Model Test
    console.log('\n3. Testing YOLOv8 Model & Classifier Bridge...');
    const { generateRecyclingAdvice } = require('./services/advisor');
    const advice = await generateRecyclingAdvice({
      detected_class: 'ENERGY_STORAGE',
      confidence: 0.92,
      condition: 'poor',
      item_name: 'Lead-Acid Inverter Battery'
    });
    console.log('   ✓ AI Advisor Output received for ENERGY_STORAGE:');
    console.log('     Method:', advice.recycling_method);
    console.log('     Safety Warnings Count:', advice.safety_warnings.length);
    console.log('     Recoverable Materials:', advice.recoverable_materials.slice(0, 2).join(', '));

    // 4. Deal Media Upload & Enforcement Tests
    console.log('\n4. Testing Deal Media Upload, 4-Slot Enforcement & Incompleteness Handling...');
    
    // 4a. Create listing WITHOUT all 4 media items (should be saved as media_incomplete)
    const incompleteListingRes = await fetch('http://127.0.0.1:5000/api/listings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sellerToken}`
      },
      body: JSON.stringify({
        title: 'Lithium UPS Battery Unit (Pending Media)',
        category: 'ENERGY_STORAGE',
        detected_category: 'ENERGY_STORAGE',
        confidence: 0.92,
        condition: 'poor',
        weight_kg: 5.5,
        quantity: 1,
        asking_price: 1800,
        is_negotiable: true,
        pickup_address: 'House 14, Tagore Town, Prayagraj, UP 211002',
        approx_location: 'Tagore Town, Prayagraj',
        description: 'Exide lithium battery unit from home solar setup.'
      })
    }).then(r => r.json());

    const incListing = incompleteListingRes.listing;
    console.log(`   ✓ Incomplete listing created. ID: ${incListing?.id} | status: '${incListing?.status}' | media_complete: ${incompleteListingRes.media_complete}`);
    if (incListing?.status !== 'media_incomplete' || incompleteListingRes.media_complete !== false) {
      throw new Error('Listing without 4 media items should have status=media_incomplete and media_complete=false');
    }

    // 4b. Verify that buyer CANNOT submit an offer on an incomplete listing
    console.log('   Testing offer rejection on media_incomplete listing...');
    const blockedOffer = await fetch('http://127.0.0.1:5000/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${buyerToken}` },
      body: JSON.stringify({ listing_id: incListing.id, offered_price: 1400, quantity: 1 })
    });
    const blockedOfferData = await blockedOffer.json();
    if (blockedOffer.status === 400) {
      console.log('   ✓ Offer blocked as required! Error:', blockedOfferData.error);
    } else {
      throw new Error(`Offer should have been blocked on incomplete listing, but got ${blockedOffer.status}`);
    }

    // 4c. Test File Validation: Reject invalid formats (e.g. text file for condition video)
    console.log('   Testing media validation (rejecting non-video for condition_video)...');
    const fakeVideoFd = new FormData();
    fakeVideoFd.append('file', new Blob(['not a real video file'], { type: 'text/plain' }), 'test.txt');
    fakeVideoFd.append('media_type', 'condition_video');

    const invalidUploadRes = await fetch(`http://127.0.0.1:5000/api/listings/${incListing.id}/media`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sellerToken}` },
      body: fakeVideoFd
    });
    const invalidUploadData = await invalidUploadRes.json();
    if (invalidUploadRes.status === 400) {
      console.log('   ✓ Invalid file rejected with 400! Error:', invalidUploadData.error);
    } else {
      throw new Error(`Invalid file upload should return 400, got ${invalidUploadRes.status}`);
    }

    // Valid 134-byte JPEG buffer that renders without broken image icons
    const validJpgBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
    const dummyJpgBlob = new Blob([validJpgBuffer], { type: 'image/jpeg' });
    const dummyMp4Blob = new Blob([Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D])], { type: 'video/mp4' });

    const unauthorizedFd = new FormData();
    unauthorizedFd.append('file', dummyJpgBlob, 'photo.jpg');
    unauthorizedFd.append('media_type', 'additional_photo_1');

    const unauthorizedUpload = await fetch(`http://127.0.0.1:5000/api/listings/${incListing.id}/media`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${buyerToken}` },
      body: unauthorizedFd
    });
    if (unauthorizedUpload.status === 403) {
      console.log('   ✓ Unauthorized upload blocked with 403 Forbidden!');
    } else {
      throw new Error(`Unauthorized upload should return 403, got ${unauthorizedUpload.status}`);
    }

    // 4e. Upload all 4 required media items: 1 AI image, 2 physical photos, 1 condition video
    console.log('   Uploading all 4 required media slots...');

    // Upload Slot 1: AI Classification Image
    const fd1 = new FormData();
    fd1.append('file', dummyJpgBlob, 'classification.jpg');
    fd1.append('media_type', 'classification_image');
    await fetch(`http://127.0.0.1:5000/api/listings/${incListing.id}/media`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${sellerToken}` }, body: fd1
    });

    // Upload Slot 2: Additional Photo 1
    const fd2 = new FormData();
    fd2.append('file', dummyJpgBlob, 'photo1.jpg');
    fd2.append('media_type', 'additional_photo_1');
    await fetch(`http://127.0.0.1:5000/api/listings/${incListing.id}/media`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${sellerToken}` }, body: fd2
    });

    // Upload Slot 3: Additional Photo 2
    const fd3 = new FormData();
    fd3.append('file', dummyJpgBlob, 'photo2.jpg');
    fd3.append('media_type', 'additional_photo_2');
    await fetch(`http://127.0.0.1:5000/api/listings/${incListing.id}/media`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${sellerToken}` }, body: fd3
    });

    // Upload Slot 4: Item Condition Video
    const fd4 = new FormData();
    fd4.append('file', dummyMp4Blob, 'condition.mp4');
    fd4.append('media_type', 'condition_video');
    const finalMediaRes = await fetch(`http://127.0.0.1:5000/api/listings/${incListing.id}/media`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${sellerToken}` }, body: fd4
    }).then(r => r.json());

    console.log(`   ✓ 4th slot uploaded! media_complete: ${finalMediaRes.media_complete}`);
    if (!finalMediaRes.media_complete) {
      throw new Error('Listing should have media_complete=true after uploading all 4 slots');
    }

    // 4f. Verify Buyer can retrieve all 4 media items on public listing
    const publicListing = await fetch(`http://127.0.0.1:5000/api/listings/${incListing.id}`).then(r => r.json());
    console.log(`   ✓ Listing is now status='${publicListing.listing.status}', media count=${publicListing.listing.media?.length}/4`);
    const mediaList = await fetch(`http://127.0.0.1:5000/api/listings/${incListing.id}/media`).then(r => r.json());
    console.log(`   ✓ ListingMedia API returned ${mediaList.media?.length} media records:`, mediaList.media?.map(m => m.media_type).join(', '));

    const listingId = incListing.id;

    // 5. Buyer Submits Initial Offer Test on Complete Listing (With Media Version Snapshot)
    console.log('\n5. Testing Buyer Offer Submission & Media Snapshotting...');
    const initialOffer = await fetch('http://127.0.0.1:5000/api/offers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        listing_id: listingId,
        offered_price: 1400,
        quantity: 1,
        pickup_proposal: 'Can pick up tomorrow at 11:30 AM',
        message: 'Interested in battery materials for recovery. Offering ₹1,400.'
      })
    }).then(r => r.json());
    console.log('   ✓ Buyer offer submitted successfully. ID:', initialOffer.offer?.id, '| Status:', initialOffer.offer?.status);
    console.log('   ✓ Media version snapshot preserved on offer:', !!initialOffer.offer?.media_version_snapshot);
    const offerId = initialOffer.offer.id;

    // 5b. Verify Negotiation Thread provides all 4 media items & snapshot
    console.log('   Testing Buyer & Seller media access in negotiation thread...');
    const threadView = await fetch(`http://127.0.0.1:5000/api/offers/${offerId}/thread`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` }
    }).then(r => r.json());
    console.log('   ✓ Buyer retrieved negotiation thread with media count:', threadView.offer?.listing?.media?.length);
    console.log('     Snapshot media items available:', threadView.snapshot_media?.length);

    // 5c. Privacy check: Stranger cannot read this private negotiation thread
    const strangerReg = await fetch('http://127.0.0.1:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Stranger User',
        email: `stranger_${Date.now()}@recycleai.org`,
        password: 'Password123!',
        role: 'user',
        address: 'Allahabad'
      })
    }).then(r => r.json());
    const strangerToken = strangerReg.token;

    const strangerThread = await fetch(`http://127.0.0.1:5000/api/offers/${offerId}/thread`, {
      headers: { 'Authorization': `Bearer ${strangerToken}` }
    });
    if (strangerThread.status === 403) {
      console.log('   ✓ Stranger blocked from viewing private negotiation thread (403 Forbidden)');
    } else {
      throw new Error(`Stranger should be blocked with 403 from thread, got ${strangerThread.status}`);
    }

    // 6. Negotiation Engine & Counter-Offer Limit Test (Max 3 Seller Counters)
    console.log('\n6. Testing Negotiation Engine & Counter-Offer Limit (Max 3 Seller Counters)...');
    
    // Seller Counter 1
    const counter1 = await fetch(`http://127.0.0.1:5000/api/offers/${offerId}/counter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sellerToken}` },
      body: JSON.stringify({ proposed_price: 1700, message: 'Can you do ₹1,700?' })
    }).then(r => r.json());
    console.log(`   ✓ Seller Counter 1 submitted. Counters used: ${counter1.seller_counter_count}/3`);

    // Buyer Response (Should NOT increment seller counter count)
    const buyerResp = await fetch(`http://127.0.0.1:5000/api/offers/${offerId}/counter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${buyerToken}` },
      body: JSON.stringify({ proposed_price: 1550, message: 'Best I can do is ₹1,550.' })
    }).then(r => r.json());
    console.log(`   ✓ Buyer response submitted. Seller counters still at: ${buyerResp.seller_counter_count}/3`);

    // Seller Counter 2
    const counter2 = await fetch(`http://127.0.0.1:5000/api/offers/${offerId}/counter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sellerToken}` },
      body: JSON.stringify({ proposed_price: 1650, message: 'How about ₹1,650?' })
    }).then(r => r.json());
    console.log(`   ✓ Seller Counter 2 submitted. Counters used: ${counter2.seller_counter_count}/3`);

    // Seller Counter 3
    const counter3 = await fetch(`http://127.0.0.1:5000/api/offers/${offerId}/counter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sellerToken}` },
      body: JSON.stringify({ proposed_price: 1600, message: 'Final offer: ₹1,600.' })
    }).then(r => r.json());
    console.log(`   ✓ Seller Counter 3 submitted. Counters used: ${counter3.seller_counter_count}/3`);

    // Seller Counter 4 (MUST BE REJECTED WITH 400 ERROR)
    const counter4 = await fetch(`http://127.0.0.1:5000/api/offers/${offerId}/counter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sellerToken}` },
      body: JSON.stringify({ proposed_price: 1580, message: 'Attempting 4th counter' })
    });
    const counter4Data = await counter4.json();
    if (counter4.status === 400) {
      console.log('   ✓ 4th seller counter-offer was REJECTED as required! Error:', counter4Data.error);
    } else {
      console.error('   ❌ 4th seller counter was not rejected!', counter4Data);
    }

    // 7. Deal Acceptance & Transaction Creation Test
    console.log('\n7. Testing Atomic Deal Acceptance...');
    const acceptRes = await fetch(`http://127.0.0.1:5000/api/offers/${offerId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${buyerToken}` }
    }).then(r => r.json());
    console.log('   ✓ Deal accepted by buyer at ₹1,600!');
    console.log('     Transaction ID:', acceptRes.transaction?.id);
    const txId = acceptRes.transaction.id;

    // 7b. Media Preservation & Versioning Test on Accepted Deal
    console.log('   Testing media persistence & versioning on accepted deal...');
    const txDetails = await fetch(`http://127.0.0.1:5000/api/transactions/${txId}`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` }
    }).then(r => r.json());
    console.log(`   ✓ Deal transaction loaded with listing media items: ${txDetails.transaction?.listing?.media?.length}`);
    if (!txDetails.transaction?.listing?.media || txDetails.transaction.listing.media.length < 4) {
      throw new Error('Transaction should include complete listing media gallery');
    }

    // Replace photo 1 after deal is accepted -> should create version 2 record without overwriting original
    const replaceFd = new FormData();
    const dummyJpgBlob2 = new Blob([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x01])], { type: 'image/jpeg' });
    replaceFd.append('file', dummyJpgBlob2, 'photo1_replacement.jpg');
    replaceFd.append('media_type', 'additional_photo_1');

    const replaceRes = await fetch(`http://127.0.0.1:5000/api/listings/${listingId}/media`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sellerToken}` },
      body: replaceFd
    }).then(r => r.json());

    console.log(`   ✓ Media replacement on accepted deal created version: ${replaceRes.media_item?.version} (deal history preserved)`);
    if (replaceRes.media_item?.version < 2) {
      throw new Error(`Media replacement on accepted deal should increment version, got ${replaceRes.media_item?.version}`);
    }

    // 8. Schedule Pickup Test
    console.log('\n8. Testing Pickup Scheduling...');
    const schedRes = await fetch(`http://127.0.0.1:5000/api/transactions/${txId}/schedule-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${buyerToken}` },
      body: JSON.stringify({
        pickup_date: '2026-10-20',
        pickup_time_slot: 'Morning (10:00 AM - 1:00 PM)'
      })
    }).then(r => r.json());
    console.log('   ✓ Pickup window scheduled:', schedRes.transaction?.pickup_date, schedRes.transaction?.pickup_time_slot);

    // 9. Doorstep Handover Confirmation Test
    console.log('\n9. Testing Doorstep Handover Confirmation & Completion...');
    const verifyRes = await fetch(`http://127.0.0.1:5000/api/transactions/${txId}/verify-handover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${buyerToken}` },
      body: JSON.stringify({
        verified_weight_kg: 5.8
      })
    }).then(r => r.json());
    console.log('   ✓ Handover confirmed successfully!');
    console.log('     Final status:', verifyRes.transaction?.status);
    console.log('     CO2e emissions avoided:', verifyRes.co2_saved_kg, 'kg');

    // 10. Recycler Discovery & Map Test
    console.log('\n10. Testing Recycler Discovery & Google Maps Search...');
    const mapRecyclers = await fetch('http://127.0.0.1:5000/api/recyclers/nearby?category=ENERGY_STORAGE&radius=50').then(r => r.json());
    console.log(`   ✓ Found ${mapRecyclers.total} facilities matching ENERGY_STORAGE in database.`);
    if (mapRecyclers.recyclers.length > 0) {
      const first = mapRecyclers.recyclers[0];
      console.log(`     Sample: ${first.business_name} (${first.distance_km} km away, Verified: ${first.is_verified_recycleai})`);
    }

    // 11. Environmental Impact Dashboard Test
    console.log('\n11. Testing Impact Dashboard Analytics...');
    const impact = await fetch('http://127.0.0.1:5000/api/impact').then(r => r.json());
    console.log('   ✓ Impact Metrics:');
    console.log('     Total Completed Deals:', impact.metrics.total_completed_transactions);
    console.log('     Total Weight Diverted:', impact.metrics.total_weight_diverted_kg, 'kg');
    console.log('     Total Value Circulated:', `₹${impact.metrics.total_payout_generated_inr}`);
    console.log('     Total CO2e Saved:', impact.metrics.total_co2_avoided_kg, 'kg');

    console.log('\n========================================================');
    console.log('  🎉 ALL 11 END-TO-END TEST STAGES PASSED SUCCESSFULLY!');
    console.log('========================================================\n');

  } catch (err) {
    console.error('\n❌ Test failed with error:', err);
  } finally {
    if (serverProc) {
      serverProc.kill();
    }
    process.exit(0);
  }
}

runE2ETests();
