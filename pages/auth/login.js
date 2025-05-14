import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import Layout from '../../components/Layout';
import { useAuth } from '../../hooks/useAuth';
import { isValidEmail } from '../../lib/utils';
import logger from '../../lib/logger';

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const { redirect, registered } = router.query;
  const [loginError, setLoginError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      setLoginError(null);
      
      const { success, error } = await login(data.email, data.password);
      
      if (!success) {
        setLoginError(error || 'Invalid email or password');
        return;
      }
      
      // Redirect to the previous page or home
      router.push(redirect || '/');
    } catch (error) {
      logger.error('Login error:', error);
      setLoginError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout title="Log In | Rec'd">
      <div className="auth-page">
        <div className="auth-container">
          <h1 className="auth-title">Log In</h1>
          
          {registered && (
            <div className="auth-success">
              <p>Account created successfully! Please check your email to confirm your account before logging in.</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email"
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="Enter your email"
                disabled={isLoading}
                {...register('email', { 
                  required: 'Email is required',
                  validate: value => isValidEmail(value) || 'Please enter a valid email'
                })}
              />
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                type="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Enter your password"
                disabled={isLoading}
                {...register('password', { 
                  required: 'Password is required'
                })}
              />
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
            </div>
            
            {loginError && (
              <div className="auth-error">
                {loginError}
              </div>
            )}
            
            <button 
              type="submit" 
              className="auth-button"
              disabled={isLoading}
            >
              {isLoading ? 'Logging In...' : 'Log In'}
            </button>
            
            <div className="auth-alternative">
              <p>
                Don't have an account?{' '}
                <Link href={`/auth/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}>
                  Sign Up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}