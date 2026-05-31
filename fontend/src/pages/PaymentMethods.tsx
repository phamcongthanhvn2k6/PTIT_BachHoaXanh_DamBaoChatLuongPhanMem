import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { loadPaymentMethods, loadPaymentTransactions, setDefaultPayment, deletePaymentMethod, addPaymentMethod } from '../slices/paymentSlice';
import { toast } from '../components/Toast/toastEvent';

const PaymentMethods: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAppSelector(state => state.auth);
  const { methods, transactions, status, error } = useAppSelector(state => state.payment);
  
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formType, setFormType] = useState('card');
  const [holderName, setHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [walletPhone, setWalletPhone] = useState('');
  const [brand, setBrand] = useState('VISA');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      dispatch(loadPaymentMethods(undefined));
      dispatch(loadPaymentTransactions());
    }
  }, [dispatch, currentUser?.id]);

  const handleSetDefault = async (methodId: string) => {
    if (!currentUser) return;
    try {
      await dispatch(setDefaultPayment({ methodId })).unwrap();
      toast.success('Đã chọn phương thức mặc định!');
    } catch {
      toast.error('Lỗi khi cài phương thức mặc định.');
    }
  };

  const handleDelete = async (methodId: string, isDef: boolean) => {
    if (isDef && methods.length > 1) {
       toast.error('Vui lòng chọn mặc định cho phương thức khác trước khi xoá.');
       return;
    }
    if (!window.confirm("Bạn có chắc chắn muốn xoá phương thức này?")) return;
    try {
      await dispatch(deletePaymentMethod(methodId)).unwrap();
      toast.success('Đã xoá phương thức thanh toán!');
    } catch {
      toast.error('Lỗi khi xoá phương thức.');
    }
  };

  const checkLuhn = (numStr: string): boolean => {
    const clean = numStr.replace(/\D/g, '');
    if (!clean || clean.length < 13 || clean.length > 19) return false;
    let sum = 0;
    let double = false;
    for (let i = clean.length - 1; i >= 0; i--) {
      let digit = parseInt(clean.charAt(i), 10);
      if (double) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      double = !double;
    }
    return sum % 10 === 0;
  };

  const isFutureExpiry = (expiryStr: string): boolean => {
    if (!/^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/.test(expiryStr)) return false;
    const parts = expiryStr.split('/');
    const month = parseInt(parts[0], 10);
    let year = parseInt(parts[1], 10);
    if (year < 100) year += 2000;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    return true;
  };

  const isValidCardholderName = (name: string): boolean => {
    return /^[A-Z\s]+$/.test(name.trim());
  };

  const mockEncrypt = (text: string): string => {
    return 'MOCK_ENC_' + btoa(text);
  };

  const validateForm = () => {
    if (formType === 'card') {
       const cleanCard = cardNumber.replace(/\s/g, '');
       if (!holderName.trim()) return "Vui lòng nhập tên in trên thẻ";
       if (!isValidCardholderName(holderName.toUpperCase())) {
          return "Tên in trên thẻ phải viết hoa không dấu và chỉ chứa chữ cái (Ví dụ: NGUYEN VAN A)";
       }
       if (cleanCard.length < 13 || cleanCard.length > 19) {
          return "Số thẻ phải từ 13 đến 19 chữ số";
       }
       if (!checkLuhn(cleanCard)) {
          return "Số thẻ không hợp lệ (Lỗi kiểm định Luhn)";
       }
       if (!isFutureExpiry(expiry)) {
          return "Ngày hết hạn không hợp lệ hoặc đã quá hạn (định dạng MM/YY hoặc MM/YYYY)";
       }
       if (!/^\d{3,4}$/.test(cvv)) {
          return "Mã CVC/CVV không hợp lệ (phải gồm 3 hoặc 4 chữ số)";
       }
       
       // Duplicate check
       const last4 = cleanCard.slice(-4);
       const isDup = methods.some(m => m.type === 'card' && m.brand === brand && m.last4 === last4);
       if (isDup) {
          return "Thẻ thanh toán này đã được thêm từ trước";
       }
    } else {
       if (walletPhone.length < 10) return "Số điện thoại ví không hợp lệ";
       const isDup = methods.some(m => m.type === 'wallet' && m.brand === brand && m.phone === walletPhone);
       if (isDup) {
          return "Ví điện tử này đã được liên kết từ trước";
       }
    }
    return null;
  };

  const handleAddMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const err = validateForm();
    if (err) {
       toast.error(err);
       return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
         type: formType,
         is_default: isDefault || methods.length === 0,
      };

      if (formType === 'card') {
         const cleanCard = cardNumber.replace(/\s/g, '');
         payload.last4 = cleanCard.slice(-4);
         payload.brand = brand;
         payload.expiry = expiry;
         payload.holder_name = holderName.toUpperCase();
         
         // Secure card fields (Masking and mock encrypting sensitive details)
         payload.card_number = `•••• •••• •••• ${payload.last4}`;
         payload.card_number_encrypted = mockEncrypt(cleanCard);
         payload.cvv_encrypted = mockEncrypt(cvv);
      } else {
         payload.brand = brand;
         payload.phone = walletPhone;
         payload.phone_encrypted = mockEncrypt(walletPhone);
      }

      await dispatch(addPaymentMethod(payload)).unwrap();
      toast.success('Thêm phương thức thành công!');
      setShowModal(false);
      
      // reset form
      setHolderName(''); setCardNumber(''); setExpiry(''); setCvv(''); setWalletPhone(''); setIsDefault(false);
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi thêm phương thức mới.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return <div className="text-center py-20"><span className="material-symbols-outlined animate-spin text-4xl text-primary">autorenew</span><p>Đang tải...</p></div>;
  }
  
  if (status === 'failed') {
    return <div className="text-center py-20 text-red-500"><p>Lỗi: {error}</p></div>;
  }

  return (
    <main className="space-y-8 relative">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <section className="flex-1 flex flex-col gap-8">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Link to="/account" className="hover:text-primary">{t('common.account')}</Link>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-slate-900 dark:text-slate-100 font-semibold">{t('paymentMethods.title')}</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Phương thức thanh toán đã lưu
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Quản lý thẻ và ví điện tử để thanh toán nhanh hơn
                </p>
              </div>
              <button onClick={() => setShowModal(true)} className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all">
                <span className="material-symbols-outlined">add</span>
                Thêm phương thức mới
              </button>
            </div>

            {/* Payment Methods List */}
            {methods.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border border-dashed border-gray-200 rounded-2xl">
                  <div className="size-20 bg-slate-100 dark:bg-primary/5 rounded-full flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl">credit_card_off</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg">{t('paymentMethods.noSaved')}</h3>
                    <p className="text-slate-500 text-sm">{t('paymentMethods.addForEasy')}</p>
                  </div>
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {methods.map(method => (
                  <div key={method.id} className={`bg-white dark:bg-slate-800 rounded-xl p-6 border ${method.is_default ? 'border-primary border-2 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'} relative overflow-hidden group transition-all`}>
                    {method.is_default && (
                      <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-widest uppercase shadow">{t('address.default')}</div>
                    )}
                    <div className="flex justify-between items-start mb-8">
                      <div className={`size-12 rounded-lg ${method.type === 'wallet' ? 'bg-[#A50064] text-white font-black text-xs' : 'bg-slate-50 dark:bg-slate-700 text-blue-800'} flex items-center justify-center border border-gray-100 shadow-sm`}>
                        {method.type === 'wallet' ? method.brand : <span className="material-symbols-outlined text-3xl">credit_card</span>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(method.id, method.is_default || false)} className="p-2 justify-center flex items-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold tracking-widest leading-none">
                         {method?.type === 'wallet' ? `${(method as any)?.phone || '0000000000'}`.replace(/(\d{4})\d{3}(\d{3})/, "$1***$2") : `•••• •••• •••• ${method?.last4 || '0000'}`}
                      </h3>
                      <div className="flex justify-between items-end mt-4">
                        <div>
                          {method?.type === 'card' && (
                            <>
                              <p className="text-[10px] uppercase text-slate-400 font-bold tracking-tighter mb-0.5">{t('paymentMethods.expireExtend')}</p>
                              <p className="font-bold text-sm">{method.expiry}</p>
                            </>
                          )}
                          {(method as any).holder_name && (
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">{(method as any).holder_name}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 text-right">
                          <p className={`font-black tracking-tight text-lg ${method.is_default ? 'text-slate-900 dark:text-slate-100 italic' : method.type === 'wallet' ? 'text-[#A50064]' : 'text-slate-900 dark:text-slate-100 italic'}`}>{method.brand}</p>
                          {!method.is_default && (
                            <button onClick={() => handleSetDefault(method.id)} className="text-xs px-2 py-1 bg-gray-50 rounded font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">{t('paymentMethods.setDefault')}</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* COD Option Default Display */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center gap-3 grayscale opacity-60 pointer-events-none">
                  <div className="size-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                     <span className="material-symbols-outlined text-2xl">payments</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700">Thanh toán khi nhận hàng (COD)</h3>
                    <p className="text-xs text-slate-500 mt-1">{t('paymentMethods.alwaysAvail')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Hiển thị Lịch sử giao dịch */}
            <div className="mt-8">
               <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                 <h3 className="text-xl font-bold">{t('paymentMethods.txHistory')}</h3>
               </div>
               {transactions.length === 0 ? (
                 <p className="text-slate-500 bg-gray-50 p-6 rounded-xl text-center">{t('paymentMethods.noTx')}</p>
               ) : (
                 <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                       <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold uppercase text-xs">
                             <tr>
                                <th className="px-6 py-4">{t('paymentMethods.txId')}</th>
                                <th className="px-6 py-4">Nguồn</th>
                                <th className="px-6 py-4">Số tiền</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4">{t('common.time')}</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                             {transactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                   <td className="px-6 py-4 font-mono text-xs">{tx.transaction_id || tx.id}</td>
                                   <td className="px-6 py-4 font-semibold text-slate-700">{(tx as any).provider || 'CARD'}</td>
                                   <td className="px-6 py-4 font-bold text-primary">{tx.amount.toLocaleString('vi-VN')}đ</td>
                                   <td className="px-6 py-4">
                                      {tx.status === 'SUCCESS' ? (
                                         <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider bg-emerald-100 text-emerald-700">{t('paymentMethods.success')}</span>
                                      ) : tx.status === 'FAILED' ? (
                                         <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider bg-red-100 text-red-700">{t('paymentMethods.failed')}</span>
                                      ) : (
                                         <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider bg-amber-100 text-amber-700">{t('paymentMethods.processing')}</span>
                                      )}
                                   </td>
                                   <td className="px-6 py-4 text-slate-500 font-medium">{new Date(tx.created_at).toLocaleString('vi-VN')}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
               )}
            </div>
          </section>
      </div>

      {/* Modal Add Payment Method */}
      {showModal && (
         <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 disabled:pointer-events-none">
               <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-lg">{t('paymentMethods.addMethod')}</h3>
                  <button onClick={() => !isSubmitting && setShowModal(false)} className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                     <span className="material-symbols-outlined text-sm">close</span>
                  </button>
               </div>
               <form onSubmit={handleAddMethod} className="p-6">
                  
                  <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-lg">
                     <button type="button" onClick={() => { setFormType('card'); setBrand('VISA'); }} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${formType === 'card' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-800'}`}>{t('paymentMethods.bankCard')}</button>
                     <button type="button" onClick={() => { setFormType('wallet'); setBrand('MoMo'); }} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${formType === 'wallet' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-800'}`}>{t('paymentMethods.eWallet')}</button>
                  </div>

                  {formType === 'card' && (
                     <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <label className={`border rounded-xl p-3 cursor-pointer flex items-center gap-2 transition ${brand === 'VISA' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-gray-200 hover:bg-gray-50'}`}>
                             <input type="radio" name="brand" value="VISA" checked={brand === 'VISA'} onChange={(e) => setBrand(e.target.value)} className="hidden" />
                             <span className="font-black text-blue-800 italic tracking-tighter">VISA</span>
                          </label>
                          <label className={`border rounded-xl p-3 cursor-pointer flex items-center gap-2 transition ${brand === 'Mastercard' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-gray-200 hover:bg-gray-50'}`}>
                             <input type="radio" name="brand" value="Mastercard" checked={brand === 'Mastercard'} onChange={(e) => setBrand(e.target.value)} className="hidden" />
                             <span className="font-black text-orange-600 italic tracking-tighter">Mastercard</span>
                          </label>
                        </div>
                        
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('paymentMethods.cardNumber')}</label>
                           <div className="relative">
                              <input 
                                 type="text" 
                                 placeholder="0000 0000 0000 0000" 
                                 maxLength={19}
                                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary pl-10"
                                 value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\W/gi, '').replace(/(.{4})/g, '$1 ').trim())} 
                                 required
                              />
                              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">credit_card</span>
                           </div>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('paymentMethods.cardName')}</label>
                           <input type="text" placeholder="NGUYEN VAN A" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 uppercase focus:outline-none focus:border-primary" value={holderName} onChange={(e) => setHolderName(e.target.value)} required />
                        </div>
                        <div className="flex gap-4">
                           <div className="flex-1">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('paymentMethods.expDate')}</label>
                              <input type="text" placeholder="MM/YY" maxLength={5} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono font-bold focus:outline-none focus:border-primary text-slate-800 text-center" value={expiry} onChange={(e) => setExpiry(e.target.value)} required />
                           </div>
                           <div className="flex-1">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">CVC/CVV</label>
                              <input type="password" placeholder="***" maxLength={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-center tracking-widest text-slate-800 focus:outline-none focus:border-primary" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))} required />
                           </div>
                        </div>
                     </div>
                  )}

                  {formType === 'wallet' && (
                     <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <label className={`border rounded-xl p-3 cursor-pointer flex items-center justify-center transition ${brand === 'MoMo' ? 'border-[#A50064] bg-[#A50064]/5 ring-1 ring-[#A50064]' : 'border-gray-200 hover:bg-gray-50'}`}>
                             <input type="radio" name="brand" value="MoMo" checked={brand === 'MoMo'} onChange={(e) => setBrand(e.target.value)} className="hidden" />
                             <span className="font-extrabold text-[#A50064]">MoMo</span>
                          </label>
                          <label className={`border rounded-xl p-3 cursor-pointer flex items-center justify-center transition ${brand === 'ZaloPay' ? 'border-[#0068FF] bg-[#0068FF]/5 ring-1 ring-[#0068FF]' : 'border-gray-200 hover:bg-gray-50'}`}>
                             <input type="radio" name="brand" value="ZaloPay" checked={brand === 'ZaloPay'} onChange={(e) => setBrand(e.target.value)} className="hidden" />
                             <span className="font-extrabold text-[#0068FF]">ZaloPay</span>
                          </label>
                        </div>

                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('paymentMethods.walletPhone')}</label>
                           <div className="relative">
                              <input 
                                 type="tel" 
                                 placeholder="0912 345 678" 
                                 maxLength={12}
                                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary pl-10"
                                 value={walletPhone} onChange={(e) => setWalletPhone(e.target.value.replace(/\D/g, ''))} 
                                 required
                              />
                              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">call</span>
                           </div>
                        </div>
                     </div>
                  )}

                  <label className="mt-5 flex items-center gap-2 cursor-pointer select-none border border-gray-100 p-3 rounded-xl bg-gray-50">
                     <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary" />
                     <span className="text-sm font-semibold text-gray-700">{t('paymentMethods.setAsDefault')}</span>
                  </label>

                  <button type="submit" disabled={isSubmitting} className="w-full mt-6 bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center disabled:opacity-50">
                     {isSubmitting ? (
                        <span className="material-symbols-outlined animate-spin">autorenew</span>
                     ) : (
                        <span>{t('paymentMethods.saveMethod')}</span>
                     )}
                  </button>
               </form>
            </div>
         </div>
      )}
    </main>
  );
};

export default PaymentMethods;