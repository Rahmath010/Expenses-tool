export interface LineItem {
  description: string;
  amount: number;
}

export interface ReceiptData {
  merchant_name: string;
  transaction_date: string; // YYYY-MM-DD
  currency: 'USD' | 'INR' | 'GBP' | 'AED';
  total_amount: number;
  tax_amount: number;
  line_items: LineItem[];
}

export interface SavedReceiptData extends ReceiptData {
    id: number;
    status: 'synced' | 'pending_sync';
    imageData?: string; // base64 string for pending items
    mimeType?: string;
}