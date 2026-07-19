export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),

  userId: text('user_id')
    .notNull()
    .references(() => users.id),

  type: transactionTypeEnum('type')
    .notNull(),

  status: transactionStatusEnum('status')
    .notNull()
    .default('pending'),

  amount: real('amount')
    .notNull(),


  // PIX (legado)
  pixKey: text('pix_key'),
  pixName: text('pix_name'),
  pixCpf: text('pix_cpf'),


  // Asaas (legado)
  asaasPaymentId: text('asaas_payment_id'),
  asaasPixCode: text('asaas_pix_code'),
  asaasPixQrCode: text('asaas_pix_qr_code'),


  // PayPal Payouts
  paypalEmail: text('paypal_email'),
  paypalBatchId: text('paypal_batch_id'),
  paypalPayoutId: text('paypal_payout_id'),


  description: text('description'),

  createdAt: timestamp('created_at')
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow(),
});
