/**
 * 6 Yards Sarees - Track your order (track-order.html)
 *
 * The shopper enters the order number and email; the status comes from Medusa,
 * which keeps it up to date from Shiprocket (courier, AWB, tracking events).
 * ?order=1024&email=... in the link fills the form and looks it up straight away.
 */
(function () {
  const STEPS = [
    { key: 'placed', label: 'Order placed' },
    { key: 'processing', label: 'Packed' },
    { key: 'shipped', label: 'On the way' },
    { key: 'out_for_delivery', label: 'Out for delivery' },
    { key: 'delivered', label: 'Delivered' },
  ];
  const STEP_INDEX = { not_sent: 0, processing: 1, shipped: 2, issue: 2, out_for_delivery: 3, delivered: 4 };

  const $ = (id) => document.getElementById(id);

  function formatDate(value, withTime) {
    if (!value) return '';
    const d = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('en-IN', withTime
      ? { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }
      : { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function showMessage(text) {
    const el = $('track-message');
    el.textContent = text || '';
    el.hidden = !text;
  }

  function render(order) {
    const { escapeHtml } = window.Store;
    $('track-result-number').textContent = `#${order.number}`;
    $('track-result-stage').textContent = order.stage_label;

    const meta = [`Placed on ${formatDate(order.placed_at)}`];
    if (order.expected_by && !['delivered', 'cancelled', 'returned'].includes(order.stage)) {
      meta.push(`Expected by ${formatDate(order.expected_by)}`);
    }
    $('track-result-meta').textContent = meta.join(' · ');

    const link = $('track-result-link');
    link.hidden = !order.tracking_link;
    if (order.tracking_link) link.href = order.tracking_link;

    const stepsEl = $('track-result-steps');
    if (order.stage === 'cancelled' || order.stage === 'returned') {
      stepsEl.hidden = true;
    } else {
      stepsEl.hidden = false;
      const current = STEP_INDEX[order.stage] ?? 0;
      stepsEl.innerHTML = STEPS.map((s, i) => `
        <li class="track-step${i < current ? ' is-done' : ''}${i === current ? ' is-current' : ''}">
          <span class="track-step-dot" aria-hidden="true"></span>
          <span class="track-step-label">${escapeHtml(s.label)}</span>
        </li>`).join('');
    }

    const details = [];
    if (order.courier) details.push(`<div><dt>Courier</dt><dd>${escapeHtml(order.courier)}</dd></div>`);
    if (order.awb) details.push(`<div><dt>Tracking number (AWB)</dt><dd>${escapeHtml(order.awb)}</dd></div>`);
    if (order.items?.length) {
      details.push(`<div><dt>Items</dt><dd>${order.items.map((i) => `${escapeHtml(i.title)}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`).join('<br />')}</dd></div>`);
    }
    $('track-result-details').innerHTML = details.length ? `<dl>${details.join('')}</dl>` : '';

    const events = order.events || [];
    $('track-result-events').innerHTML = events.map((e) => `
      <li>
        <span class="track-event-time">${escapeHtml(formatDate(e.date, true))}</span>
        <span class="track-event-text">${escapeHtml(e.activity)}${e.location ? ` <span class="track-event-place">· ${escapeHtml(e.location)}</span>` : ''}</span>
      </li>`).join('');
    $('track-result-events').hidden = !events.length;

    if (order.stage === 'not_sent') {
      $('track-result-meta').textContent += ' · We are preparing your saree. Courier details appear here once it is packed.';
    }

    $('track-result').hidden = false;
    $('track-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function lookup(orderNumber, email) {
    const button = $('track-submit');
    showMessage('');
    $('track-result').hidden = true;
    button.disabled = true;
    button.textContent = 'Looking up your order…';
    try {
      const data = await window.MedusaClient.trackOrder(orderNumber, email);
      if (!data.found) {
        showMessage(data.message || 'We could not find that order. Check the number and email and try again.');
        return;
      }
      render(data.order);
    } catch (err) {
      showMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      button.disabled = false;
      button.textContent = 'Track order';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = $('track-form');
    const params = new URLSearchParams(window.location.search);
    if (params.get('order')) $('track-order-number').value = params.get('order').replace(/^#/, '');
    if (params.get('email')) $('track-email').value = params.get('email');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const orderNumber = $('track-order-number').value.replace(/[^\d]/g, '');
      const email = $('track-email').value.trim();
      if (!orderNumber) return showMessage('Enter your order number (you will find it in your order confirmation).');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showMessage('Enter the email you used for the order.');
      lookup(orderNumber, email);
    });

    if ($('track-order-number').value && $('track-email').value) form.requestSubmit();
  });
})();
