import RazorpayCheckout from 'react-native-razorpay';

type RazorpayOptionsInput = {
  key: string;
  amountPaise: number;
  orderId: string;
  prefillEmail?: string;
  prefillContact?: string;
};

export async function openRazorpayCheckout(options: RazorpayOptionsInput) {
  return RazorpayCheckout.open({
    key: options.key,
    amount: options.amountPaise,
    currency: 'INR',
    name: 'E Vision',
    description: 'Order payment',
    order_id: options.orderId,
    prefill: {
      email: options.prefillEmail || '',
      contact: options.prefillContact || '',
    },
    theme: { color: '#2563eb' },
  });
}
