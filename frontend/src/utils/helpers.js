import { format, formatDistanceToNow } from 'date-fns';

export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

export const formatDate = (date, fmt = 'dd MMM yyyy') => {
  if (!date) return '—';
  return format(new Date(date), fmt);
};

export const timeAgo = (date) => {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const invoiceStatusConfig = {
  draft:    { label: 'Draft',   className: 'badge-gray',   dot: 'bg-gray-400' },
  sent:     { label: 'Sent',    className: 'badge-blue',   dot: 'bg-blue-500' },
  viewed:   { label: 'Viewed',  className: 'badge-purple', dot: 'bg-purple-500' },
  paid:     { label: 'Paid',    className: 'badge-green',  dot: 'bg-emerald-500' },
  overdue:  { label: 'Overdue', className: 'badge-red',    dot: 'bg-red-500' },
  cancelled:{ label: 'Cancelled', className: 'badge-gray', dot: 'bg-gray-400' },
};

export const generateInvoiceNumber = (prefix = 'INV') => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${year}${month}-${rand}`;
};

export const calculateGST = (amount, gstRate, gstType = 'IGST') => {
  const gstAmount = (amount * gstRate) / 100;
  if (gstType === 'IGST') {
    return { igst: gstAmount, cgst: 0, sgst: 0, total: amount + gstAmount };
  }
  const half = gstAmount / 2;
  return { igst: 0, cgst: half, sgst: half, total: amount + gstAmount };
};

export const cn = (...classes) => classes.filter(Boolean).join(' ');