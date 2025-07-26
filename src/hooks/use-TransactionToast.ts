import { useState, useCallback } from 'react';

interface ToastState {
  isVisible: boolean;
  txHash: string;
}

export const useTransactionToast = () => {
  const [toast, setToast] = useState<ToastState>({
    isVisible: false,
    txHash: ''
  });

  const showToast = useCallback((txHash: string) => {
    setToast({
      isVisible: true,
      txHash
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({
      ...prev,
      isVisible: false
    }));
  }, []);

  return {
    toast,
    showToast,
    hideToast
  };
};