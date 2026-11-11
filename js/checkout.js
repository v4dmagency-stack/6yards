/**
 * 6 Yards Sarees - Checkout (checkout.html)
 *
 * Online (Medusa reachable): saves contact + address on the Medusa cart, lets
 * the shopper pick a shipping option and payment provider, then completes the
 * cart so a real order appears in Medusa Admin → Orders.
 *
 * Offline (backend unreachable): the order details are sent to the shop on
 * WhatsApp for manual confirmation. No payment is taken and nothing is shown
 * as "paid".
 */

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
];

const PAYMENT_LABELS = {
  pp_system_default: {
    title: 'Cash on Delivery / Pay on Confirmation',
    desc: 'Place your order now. Our team will call or WhatsApp you to confirm and share payment options (UPI, bank transfer or cash on delivery).',
  },
};

const CheckoutState = {
  step: 'details',
  details: null,
  shippingOptions: [],
  paymentProviders: [],
  placing: false,
};

document.addEventListener('DOMContentLoaded', async () => {
  const stateSelect = document.getElementById('co-state');
  if (stateSelect) {
    stateSelect.insertAdjacentHTML('beforeend', INDIAN_STATES.map((s) => `<option value="${s}">${s}</option>`).join(''));
  }
  restoreSavedDetails();
  renderSummary();

  await window.Store.ready;
  renderSummary();
  if (!window.Store.Cart.items.length) {
    showEmpty();
    return;
  }
  document.getElementById('checkout-offline-note').hidden = window.Store.isOnline();

  document.getElementById('checkout-details-form').addEventListener('submit', onDetailsSubmit);
  document.getElementById('checkout-place-order').addEventListener('click', placeOrder);
  document.getElementById('checkout-edit-details').addEventListener('click', () => goToStep('details'));
});

/* --------------------------------------------------------------------------
   Summary
   -------------------------------------------------------------------------- */
function renderSummary() {
  const { Cart, escapeHtml, formatINR } = window.Store;
  const list = document.getElementById('checkout-summary-items');
  if (!list) return;

  list.innerHTML = Cart.items.map((item) => `
    <li class="checkout-summary-item">
      <div class="checkout-summary-thumb">
        <img src="${escapeHtml(item.image)}" alt="" loading="lazy" />
        <span class="checkout-summary-qty">${item.quantity}</span>
      </div>
      <span class="checkout-summary-name">${escapeHtml(item.name)}</span>
      <span class="checkout-summary-price">${formatINR(item.price * item.quantity)}</span>
    </li>`).join('');

  const t = Cart.totals();
  const shipping = selectedShippingAmount() ?? t.shipping ?? Cart.estimatedShipping(t.total);
  setText('checkout-subtotal', formatINR(t.subtotal));
  const discountRow = document.getElementById('checkout-discount-row');
  if (discountRow) discountRow.hidden = !(t.discount > 0);
  setText('checkout-discount', `− ${formatINR(t.discount)}`);
  setText('checkout-discount-label', Cart.promoCode ? `Promo (${Cart.promoCode})` : 'Discount');
  setText('checkout-shipping', shipping === 0 ? 'Free' : formatINR(shipping));
  const total = Cart.mode === 'medusa' && t.shipping != null ? t.total : t.total + shipping;
  setText('checkout-total', formatINR(total));
}

function selectedShippingAmount() {
  const checked = document.querySelector('input[name="shipping-option"]:checked');
  if (!checked) return null;
  const amount = Number(checked.dataset.amount);
  return Number.isFinite(amount) ? amount : null;
}

function showEmpty() {
  document.getElementById('checkout-main').hidden = true;
  document.getElementById('checkout-empty').hidden = false;
}

/* --------------------------------------------------------------------------
   Step 1: contact & address
   -------------------------------------------------------------------------- */
function readDetails() {
  const v = (id) => (document.getElementById(id)?.value || '').trim();
  return {
    email: v('co-email').toLowerCase(),
    address: {
      first_name: v('co-first-name'),
      last_name: v('co-last-name'),
      phone: v('co-phone').replace(/[\s-]/g, ''),
      address_1: v('co-address1'),
      address_2: v('co-address2'),
      city: v('co-city'),
      province: v('co-state'),
      postal_code: v('co-pincode'),
    },
    notes: v('co-notes'),
  };
}

function validateDetails(d) {
  const errors = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errors.push(['co-email', 'Enter a valid email address.']);
  if (!d.address.first_name) errors.push(['co-first-name', 'Enter your first name.']);
  if (!d.address.last_name) errors.push(['co-last-name', 'Enter your last name.']);
  if (!/^(\+?91)?[6-9]\d{9}$/.test(d.address.phone)) errors.push(['co-phone', 'Enter a valid 10-digit Indian mobile number.']);
  if (!d.address.address_1) errors.push(['co-address1', 'Enter your street address.']);
  if (!d.address.city) errors.push(['co-city', 'Enter your city.']);
  if (!d.address.province) errors.push(['co-state', 'Select your state.']);
  if (!/^[1-9]\d{5}$/.test(d.address.postal_code)) errors.push(['co-pincode', 'Enter a valid 6-digit PIN code.']);
  return errors;
}

function showFieldErrors(errors) {
  document.querySelectorAll('.checkout-field-error').forEach((el) => el.remove());
  document.querySelectorAll('.checkout-form [aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  errors.forEach(([id, message]) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.setAttribute('aria-invalid', 'true');
    const msg = document.createElement('span');
    msg.className = 'checkout-field-error';
    msg.textContent = message;
    input.insertAdjacentElement('afterend', msg);
  });
  if (errors.length) document.getElementById(errors[0][0])?.focus();
}

async function onDetailsSubmit(event) {
  event.preventDefault();
  const details = readDetails();
  const errors = validateDetails(details);
  showFieldErrors(errors);
  if (errors.length) return;

  CheckoutState.details = details;
  saveDetails(details);
  const button = event.submitter || document.getElementById('checkout-continue');
  setBusy(button, true, 'Saving…');

  try {
    if (window.Store.isOnline()) {
      await window.MedusaClient.updateCartDetails(details);
      const [options, providers] = await Promise.all([
        window.MedusaClient.listShippingOptions(),
        window.MedusaClient.listPaymentProviders(),
      ]);
      if (!options.length) throw new Error('Sorry, we do not deliver to this address yet. Please contact us on WhatsApp.');
      CheckoutState.shippingOptions = options;
      CheckoutState.paymentProviders = providers;
    } else {
      CheckoutState.shippingOptions = [];
      CheckoutState.paymentProviders = [];
    }
    renderDeliveryAndPayment();
    goToStep('payment');
  } catch (err) {
    window.Store.showToast(err.message || 'Could not save your details. Please try again.', 'error');
  } finally {
    setBusy(button, false);
  }
}

/* --------------------------------------------------------------------------
   Step 2: delivery & payment
   -------------------------------------------------------------------------- */
function shippingOptionAmount(option) {
  const amount = option.calculated_price?.calculated_amount ?? option.amount;
  return typeof amount === 'number' ? amount : null;
}

function renderDeliveryAndPayment() {
  const { escapeHtml, formatINR, Cart, isOnline } = window.Store;
  const d = CheckoutState.details;
  setText('checkout-review-address', [
    `${d.address.first_name} ${d.address.last_name}`,
    d.address.address_1,
    d.address.address_2,
    `${d.address.city}, ${d.address.province} ${d.address.postal_code}`,
    d.address.phone,
    d.email,
  ].filter(Boolean).join('\n'));

  const shipList = document.getElementById('checkout-shipping-options');
  const payList = document.getElementById('checkout-payment-options');

  if (isOnline()) {
    shipList.innerHTML = CheckoutState.shippingOptions.map((opt, i) => {
      const amount = shippingOptionAmount(opt);
      return `
        <label class="checkout-radio-card">
          <input type="radio" name="shipping-option" value="${escapeHtml(opt.id)}" data-amount="${amount ?? ''}" ${i === 0 ? 'checked' : ''} />
          <span class="checkout-radio-body">
            <span class="checkout-radio-title">${escapeHtml(opt.name)}</span>
            ${opt.type?.description ? `<span class="checkout-radio-desc">${escapeHtml(opt.type.description)}</span>` : ''}
          </span>
          <span class="checkout-radio-price">${amount === 0 ? 'Free' : amount == null ? '' : formatINR(amount)}</span>
        </label>`;
    }).join('');

    const providers = CheckoutState.paymentProviders.length
      ? CheckoutState.paymentProviders
      : [{ id: 'pp_system_default' }];
    payList.innerHTML = providers.map((p, i) => {
      const label = PAYMENT_LABELS[p.id] || { title: p.id.replace(/^pp_/, '').replace(/_/g, ' '), desc: '' };
      return `
        <label class="checkout-radio-card">
          <input type="radio" name="payment-provider" value="${escapeHtml(p.id)}" ${i === 0 ? 'checked' : ''} />
          <span class="checkout-radio-body">
            <span class="checkout-radio-title">${escapeHtml(label.title)}</span>
            ${label.desc ? `<span class="checkout-radio-desc">${escapeHtml(label.desc)}</span>` : ''}
          </span>
        </label>`;
    }).join('');
    setText('checkout-place-order-label', 'Place Order');
  } else {
    const t = Cart.totals();
    const shipping = Cart.estimatedShipping(t.total);
    shipList.innerHTML = `
      <label class="checkout-radio-card">
        <input type="radio" name="shipping-option" value="standard" data-amount="${shipping}" checked />
        <span class="checkout-radio-body">
          <span class="checkout-radio-title">Standard Delivery</span>
          <span class="checkout-radio-desc">Dispatched in 1–2 business days. Delivered in 3–5 business days.</span>
        </span>
        <span class="checkout-radio-price">${shipping === 0 ? 'Free' : formatINR(shipping)}</span>
      </label>`;
    payList.innerHTML = `
      <div class="checkout-radio-card is-static">
        <i class="fa-brands fa-whatsapp checkout-wa-icon"></i>
        <span class="checkout-radio-body">
          <span class="checkout-radio-title">Confirm your order on WhatsApp</span>
          <span class="checkout-radio-desc">Your order details will open in WhatsApp. Our team confirms availability and shares payment options (UPI, bank transfer or cash on delivery). Nothing is charged now.</span>
        </span>
      </div>`;
    setText('checkout-place-order-label', 'Send Order on WhatsApp');
  }

  shipList.onchange = renderSummary;
  renderSummary();
}

function goToStep(step) {
  CheckoutState.step = step;
  document.getElementById('checkout-step-details').hidden = step !== 'details';
  document.getElementById('checkout-step-payment').hidden = step !== 'payment';
  document.querySelectorAll('.checkout-progress-step').forEach((el) => {
    el.classList.toggle('active', el.dataset.step === step);
    el.classList.toggle('done', step === 'payment' && el.dataset.step === 'details');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* --------------------------------------------------------------------------
   Place order
   -------------------------------------------------------------------------- */
async function placeOrder() {
  if (CheckoutState.placing) return;
  const button = document.getElementById('checkout-place-order');
  if (!window.Store.isOnline()) {
    sendWhatsAppOrder();
    return;
  }

  const optionId = document.querySelector('input[name="shipping-option"]:checked')?.value;
  const providerId = document.querySelector('input[name="payment-provider"]:checked')?.value;
  if (!optionId || !providerId) {
    window.Store.showToast('Please choose a delivery option and payment method.', 'error');
    return;
  }

  CheckoutState.placing = true;
  setBusy(button, true, 'Placing order…');
  try {
    await window.MedusaClient.setShippingMethod(optionId);
    await window.MedusaClient.initPaymentSession(providerId);
    const order = await window.MedusaClient.completeCart();
    window.Store.Cart.clear();
    showConfirmation({
      reference: `#${order.display_id ?? order.id}`,
      email: order.email,
      total: order.total,
      online: true,
    });
  } catch (err) {
    const message = /inventory|stock/i.test(err.message || '')
      ? 'One of the sarees in your bag just sold out. Please review your bag.'
      : (err.message || 'We could not place your order. Please try again or contact us on WhatsApp.');
    window.Store.showToast(message, 'error');
  } finally {
    CheckoutState.placing = false;
    setBusy(button, false);
  }
}

function sendWhatsAppOrder() {
  const { Cart, SHOP, formatINR } = window.Store;
  const d = CheckoutState.details;
  const t = Cart.totals();
  const shipping = Cart.estimatedShipping(t.total);
  const reference = `6YD-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const lines = [
    `New order request ${reference}`,
    '',
    ...Cart.items.map((i) => `• ${i.name} (${i.id}) × ${i.quantity} — ${formatINR(i.price * i.quantity)}`),
    '',
    `Subtotal: ${formatINR(t.subtotal)}`,
    t.discount > 0 ? `Discount (${Cart.promoCode}): −${formatINR(t.discount)}` : null,
    `Shipping: ${shipping === 0 ? 'Free' : formatINR(shipping)}`,
    `Total: ${formatINR(t.total + shipping)}`,
    '',
    'Deliver to:',
    `${d.address.first_name} ${d.address.last_name}`,
    d.address.address_1,
    d.address.address_2 || null,
    `${d.address.city}, ${d.address.province} - ${d.address.postal_code}`,
    `Phone: ${d.address.phone}`,
    `Email: ${d.email}`,
    d.notes ? `Notes: ${d.notes}` : null,
  ].filter((line) => line !== null);

  const url = `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
  const win = window.open(url, '_blank', 'noopener');
  if (!win) window.location.href = url;

  showConfirmation({ reference, email: d.email, total: t.total + shipping, online: false });
}

function showConfirmation({ reference, email, total, online }) {
  const { formatINR } = window.Store;
  document.getElementById('checkout-main').hidden = true;
  const box = document.getElementById('checkout-confirmation');
  box.hidden = false;
  setText('checkout-confirm-ref', reference);
  setText('checkout-confirm-total', formatINR(total));
  setText('checkout-confirm-email', email || '');
  setText('checkout-confirm-title', online ? 'Thank you! Your order is placed.' : 'Almost done — send the WhatsApp message');
  setText('checkout-confirm-text', online
    ? 'We have received your order and will contact you shortly to confirm payment and dispatch. A copy of your order details has been saved with this reference.'
    : 'Your order details are ready in WhatsApp. Please press send so our team can confirm availability and share payment options. Your bag is kept until you clear it.');
  document.getElementById('checkout-clear-bag').hidden = online;
  document.getElementById('checkout-clear-bag').onclick = () => {
    window.Store.Cart.clear();
    window.location.href = 'collections.html';
  };
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setBusy(button, busy, label) {
  if (!button) return;
  button.disabled = busy;
  if (busy) {
    button.dataset.label = button.innerHTML;
    button.textContent = label;
  } else if (button.dataset.label) {
    button.innerHTML = button.dataset.label;
  }
}

const DETAILS_KEY = '6yards_checkout_details';
function saveDetails(details) {
  try { localStorage.setItem(DETAILS_KEY, JSON.stringify({ email: details.email, address: details.address })); } catch (e) { /* ignore */ }
}

function restoreSavedDetails() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(DETAILS_KEY) || 'null'); } catch (e) { /* ignore */ }
  if (!saved) return;
  const set = (id, value) => { const el = document.getElementById(id); if (el && value) el.value = value; };
  set('co-email', saved.email);
  const a = saved.address || {};
  set('co-first-name', a.first_name);
  set('co-last-name', a.last_name);
  set('co-phone', a.phone);
  set('co-address1', a.address_1);
  set('co-address2', a.address_2);
  set('co-city', a.city);
  set('co-state', a.province);
  set('co-pincode', a.postal_code);
}
