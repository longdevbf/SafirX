import React, { useState, useEffect } from 'react';
import { CheckCircle, Copy, ExternalLink, X } from 'lucide-react';

interface TransactionToastProps {
  txHash: string;
  onClose: () => void;
  duration?: number;
}

const TransactionToast: React.FC<TransactionToastProps> = ({ 
  txHash, 
  onClose, 
  duration = 5000 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const openExplorer = () => {
    window.open(`https://explorer.oasis.io/testnet/sapphire/tx/${txHash}`, '_blank');
  };

  const formatTxHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-6)}`;
  };

  return (
    <div
      className={`fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80 max-w-96 transition-all duration-300 ease-in-out z-50 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              Transaction Successful
            </h4>
            <p className="text-xs text-gray-600 mb-2">
              Your transaction has been confirmed
            </p>
            <div className="flex items-center space-x-2">
              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                {formatTxHash(txHash)}
              </code>
              <button
                onClick={copyToClipboard}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title={copied ? "Copied!" : "Copy transaction hash"}
              >
                <Copy className={`w-4 h-4 ${copied ? 'text-green-500' : 'text-gray-500'}`} />
              </button>
              <button
                onClick={openExplorer}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="View on Explorer"
              >
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="p-1 hover:bg-gray-100 rounded transition-colors ml-2"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
};

export default TransactionToast;