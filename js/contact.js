/**
 * 6 Yards Sarees - Contact page
 *
 * The styling/consultation form has no mail server behind it, so instead of
 * pretending to "submit", it opens WhatsApp with the enquiry pre-filled for the
 * shop's concierge number.
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('concierge-inquiry-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const { showToast, SHOP } = window.Store;
    const value = (id) => (document.getElementById(id)?.value || '').trim();

    const name = value('contact-name');
    const phone = value('contact-phone').replace(/[^\d+]/g, '');
    const email = value('contact-email');
    const serviceSelect = document.getElementById('contact-service');
    const service = serviceSelect?.selectedOptions[0]?.textContent.trim() || '';
    const date = value('contact-date');
    const message = value('contact-message');

    if (!name) return fail('contact-name', 'Please enter your name.');
    if (!/^(\+?91)?[6-9]\d{9}$/.test(phone) && !/^\+\d{8,15}$/.test(phone)) {
      return fail('contact-phone', 'Please enter a valid phone number.');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail('contact-email', 'Please enter a valid email address.');
    }

    const details = [
      `Name: ${name}`,
      `Phone: ${phone}`,
      email && `Email: ${email}`,
      service && `Consultation: ${service}`,
      date && `Preferred date: ${date}`,
      message && `Message: ${message}`,
    ].filter(Boolean);
    const text = ['Hello 6 Yards! I would like to book a consultation.', '', ...details].join('\n');

    const url = `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(text)}`;
    const win = window.open(url, '_blank', 'noopener');
    if (!win) window.location.href = url;
    showToast(`Thank you, ${name}! Send the WhatsApp message and our stylist will reply shortly.`, 'success');
    form.reset();

    function fail(id, text) {
      showToast(text, 'error');
      document.getElementById(id)?.focus();
    }
  });
});
