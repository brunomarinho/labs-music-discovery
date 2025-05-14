import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import Layout from '../../components/Layout';
import logger from '../../lib/logger';
import { useAuth } from '../../hooks/useAuth';
import useUserLimits from '../../hooks/useUserLimits';
import { isValidEmail, isValidPassword } from '../../lib/utils';

export default function Signup() {
  const { register: registerUser } = useAuth();
  const { canRegister, loading: limitsLoading } = useUserLimits();
  const router = useRouter();
  const { redirect } = router.query;
  const [signupError, setSignupError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password', '');

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      setSignupError(null);
      
      // Check if registration is open
      if (!canRegister) {
        setSignupError('Registration is currently closed');
        return;
      }
      
      const { success, error } = await registerUser(data.email, data.password);
      
      if (!success) {
        setSignupError(error || 'Failed to create account');
        return;
      }
      
      // Redirect to login page with success message
      router.push(`/auth/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}${redirect ? '&' : '?'}registered=true`);
    } catch (error) {
      logger.error('Signup error:', error);
      setSignupError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking limits
  if (limitsLoading) {
    return (
      <Layout title="Sign Up | Rec'd">
        <div className="auth-page">
          <div className="auth-container">
            <h1 className="auth-title">Sign Up</h1>
            <p className="loading-message">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show closed registration message
  if (!canRegister) {
    return (
      <Layout title="Registration Closed | Rec'd">
        <div className="auth-page">
          <div className="auth-container">
            <h1 className="auth-title">Registration Closed</h1>
            <p className="closed-message">
              We've reached our user limit. Check back later or contact the administrator.
            </p>
            <Link href="/auth/login" className="auth-redirect-link">
              Already have an account? Log In
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Sign Up | Rec'd">
      <div className="auth-page">
        <div className="auth-container">
          <h1 className="auth-title">Create an Account</h1>
          
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
                  required: 'Password is required',
                  validate: value => 
                    isValidPassword(value) || 
                    'Password must be at least 8 characters'
                })}
              />
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm your password"
                disabled={isLoading}
                {...register('confirmPassword', { 
                  required: 'Please confirm your password',
                  validate: value => 
                    value === password || 'Passwords do not match'
                })}
              />
              {errors.confirmPassword && (
                <p className="form-error">{errors.confirmPassword.message}</p>
              )}
            </div>
            
            {signupError && (
              <div className="auth-error">
                {signupError}
              </div>
            )}
            
            <button 
              type="submit" 
              className="auth-button"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
            
            <div className="auth-note">
              <p>
                By signing up, you'll get 3 artist searches to generate personalized 
                recommendations.
              </p>
              <p className="email-confirmation-note">
                Please check your email to confirm your account after signing up.
              </p>
            </div>
            
            <div className="auth-alternative">
              <p>
                Already have an account?{' '}
                <Link href={`/auth/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}>
                  Log In
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}