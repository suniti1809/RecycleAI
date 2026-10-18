import { createContext, useContext, useState, useCallback } from 'react';
import { Auth } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => Auth.getUser());

  const login = useCallback((token, userData) => {
    Auth.setToken(token);
    Auth.setUser(userData);
    setUserState(userData);
  }, []);

  const logout = useCallback(() => {
    Auth.clear();
    setUserState(null);
  }, []);

  const updateUser = useCallback((updatedUserData) => {
    const merged = { ...Auth.getUser(), ...updatedUserData };
    Auth.setUser(merged);
    setUserState(merged);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoggedIn: !!user, isRecycler: user?.role === 'recycler' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
