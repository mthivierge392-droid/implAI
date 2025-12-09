'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mail, User, MessageSquare, Send, X } from 'lucide-react';
import { showToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

interface ContactFormProps {
  onClose: () => void;
}

export default function ContactForm({ onClose }: ContactFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!validateEmail(email)) newErrors.email = 'Please enter a valid email';
    if (!message.trim()) newErrors.message = 'Message is required';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      showToast('Message sent successfully!', 'success');
      setName('');
      setEmail('');
      setMessage('');
      setTimeout(() => onClose(), 1500);

    } catch (error: any) {
      console.error('Contact form error:', error);
      showToast(error.message || 'Failed to send message', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-6 z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl p-12 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-accent rounded-lg"
          disabled={loading}
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="mb-10">
          <h2 className="text-4xl font-bold text-foreground">{siteConfig.contact.title}</h2>
          <p className="text-lg text-muted-foreground mt-3">
            {siteConfig.contact.subtitle}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name field */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Name
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                id="name"
                type="text"
                name="name"
                autoComplete="name"
                placeholder={siteConfig.contact.namePlaceholder}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                }}
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-ring transition-all",
                  errors.name && "border-destructive focus:border-destructive focus:ring-destructive"
                )}
                disabled={loading}
              />
            </div>
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Email field */}
          <div className="space-y-2">
            <label htmlFor="contact-email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                id="contact-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder={siteConfig.contact.emailPlaceholder}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-ring transition-all",
                  errors.email && "border-destructive focus:border-destructive focus:ring-destructive"
                )}
                disabled={loading}
              />
            </div>
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          {/* Message field */}
          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium text-foreground">
              Message
            </label>
            <div className="relative">
              <MessageSquare size={16} className="absolute left-3 top-3 text-muted-foreground pointer-events-none" />
              <textarea
                id="message"
                name="message"
                placeholder={siteConfig.contact.messagePlaceholder}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (errors.message) setErrors(prev => ({ ...prev, message: undefined }));
                }}
                rows={4}
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground resize-none",
                  "focus:ring-2 focus:ring-ring focus:border-ring transition-all",
                  errors.message && "border-destructive focus:border-destructive focus:ring-destructive"
                )}
                disabled={loading}
              />
            </div>
            {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              {siteConfig.contact.cancelButton}
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={loading}
              className="flex-1"
            >
              <Send size={16} />
              {siteConfig.contact.submitButton}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
