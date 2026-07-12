import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { isEmail } from '@/lib/validation';
export function ForgotPasswordPage() {
 const { t, resetPassword } = useApp(); const [email,setEmail]=useState(''); const [error,setError]=useState(''); const [done,setDone]=useState(false);
 const submit=async(e:FormEvent)=>{e.preventDefault();setError('');if(!isEmail(email))return setError('Enter a valid email address.');try{await resetPassword(email);setDone(true);}catch(reason){setError(reason instanceof Error?reason.message:'Unable to reset password.');}};
 return <form className="stack" onSubmit={(e)=>void submit(e)}><h1>{t('resetPassword')}</h1><p className="muted">Enter your email and we will send recovery instructions.</p><label>{t('email')}<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} /></label>{error?<p className="form-error">{error}</p>:null}{done?<p className="success-message">{t('resetSent')}</p>:null}<button className="button">{t('resetPassword')}</button><Link to="/auth/login">{t('back')}</Link></form>;
}
