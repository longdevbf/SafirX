export interface WalletContextType {
  isConnected: boolean;
  address: string | undefined;
  connect: () => void;
  disconnect: () => void;
  isLoading: boolean;
}