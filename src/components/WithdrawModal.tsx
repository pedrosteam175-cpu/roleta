'use client';

import { useState } from 'react';

interface WithdrawModalProps {
  balance: number;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

export default function WithdrawModal({
  balance,
  onClose,
  onSuccess,
}: WithdrawModalProps) {

  const [amount, setAmount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);


  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();

    const value = Number(amount);


    if (!value || value <= 0) {
      setError('Informe um valor válido');
      return;
    }


    if (value > balance) {
      setError('Saldo insuficiente');
      return;
    }


    if (
      !paypalEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)
    ) {
      setError('Informe um e-mail PayPal válido');
      return;
    }


    setError('');
    setLoading(true);


    try {

      const res = await fetch('/api/payment/withdraw', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        credentials: 'include',

        body: JSON.stringify({
          amount: value,
          paypalEmail,
        }),
      });


      const data = await res.json();


      if (!res.ok) {
        setError(data.error || 'Erro ao processar saque');
        return;
      }


      setSuccess(true);
      onSuccess(data.newBalance);


    } catch {

      setError('Erro ao processar saque');

    } finally {

      setLoading(false);

    }
  }


  return (

    <div
      className="modal-overlay"
      onClick={onClose}
    >

      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
      >


        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 20,
            alignItems: 'center',
          }}
        >

          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            💸 Sacar
          </h2>


          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: 24,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>

        </div>



        {success ? (

          <div
            style={{
              textAlign: 'center',
              padding: '20px 0',
            }}
          >

            <div
              style={{
                fontSize: 48,
                marginBottom: 12,
              }}
            >
              ✅
            </div>


            <h3
              style={{
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              Saque solicitado!
            </h3>


            <p
              style={{
                color: 'var(--text-muted)',
                margin: '12px 0 20px',
              }}
            >
              O pagamento será enviado para sua conta PayPal.
            </p>


            <button
              className="btn-primary"
              onClick={onClose}
            >
              Fechar
            </button>

          </div>


        ) : (


          <form
            onSubmit={handleWithdraw}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >


            <div
              style={{
                background: 'var(--bg-card2)',
                borderRadius: 12,
                padding: 14,
              }}
            >

              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: 13,
                }}
              >
                Saldo disponível
              </p>


              <p
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: 'var(--accent-green)',
                }}
              >
                R$ {balance.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </p>

            </div>



            <div
              style={{
                position: 'relative',
              }}
            >

              <span
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              >
                R$
              </span>


              <input
                className="input-field"
                style={{
                  paddingLeft: 40,
                }}
                type="number"
                step="0.01"
                min="0.01"
                max={balance}
                placeholder="Valor do saque"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />

            </div>



            <div>

              <label
                style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                E-mail da conta PayPal
              </label>


              <input
                className="input-field"
                type="email"
                placeholder="seuemail@paypal.com"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                required
              />

            </div>



            <div
              style={{
                background: 'var(--bg-card2)',
                borderRadius: 10,
                padding: 12,
                fontSize: 13,
              }}
            >

              <p style={{ color: 'var(--text-muted)' }}>
                💳 Pagamento via PayPal Payouts
              </p>


              <p style={{ color: 'var(--text-muted)' }}>
                ⏱️ Processamento estimado: até 30 minutos.
              </p>

            </div>



            {error && (

              <p
                style={{
                  color: 'var(--accent-red)',
                  fontSize: 14,
                }}
              >
                {error}
              </p>

            )}



            <button
              className="btn-primary"
              type="submit"
              disabled={loading || !amount || !paypalEmail}
            >

              {loading
                ? 'Processando...'
                : 'Solicitar Saque'}

            </button>


          </form>

        )}


      </div>

    </div>

  );
}
