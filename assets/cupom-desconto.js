/* Cupom de desconto no carrinho: registra o código na sessão da loja (/discount/CODE).
   A validade e o valor do desconto são confirmados pelo checkout da Shopify. */
(function () {
  'use strict';

  var storageKey = 'dogo-discount-coupon';
  var root = window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/';

  function stored() {
    try { return window.sessionStorage.getItem(storageKey) || ''; } catch (e) { return ''; }
  }

  function store(code) {
    try {
      if (code) window.sessionStorage.setItem(storageKey, code);
      else window.sessionStorage.removeItem(storageKey);
    } catch (e) {}
  }

  function setStatus(box, state, message) {
    box.dataset.state = state;
    var node = box.querySelector('[data-discount-coupon-status]');
    if (node) node.textContent = message || '';
  }

  function hydrate() {
    var code = stored();
    document.querySelectorAll('[data-discount-coupon]').forEach(function (box) {
      var input = box.querySelector('[data-discount-coupon-input]');
      var clear = box.querySelector('[data-discount-coupon-clear]');
      if (input && code && !input.value) input.value = code;
      if (clear) clear.hidden = !code;
      if (code && !box.dataset.state) setStatus(box, 'applied', box.dataset.appliedLabel);
      var details = box.closest('details');
      if (details && code) details.open = true;
    });
  }

  function register(code) {
    return fetch(root + 'discount/' + encodeURIComponent(code), { credentials: 'same-origin', redirect: 'follow', cache: 'no-store' })
      .then(function (response) { return response.ok; })
      .catch(function () { return false; });
  }

  function apply(box) {
    var input = box.querySelector('[data-discount-coupon-input]');
    var code = input ? input.value.trim() : '';
    if (!code) { setStatus(box, 'error', box.dataset.emptyLabel); return; }
    box.setAttribute('aria-busy', 'true');
    register(code).then(function (ok) {
      box.removeAttribute('aria-busy');
      if (!ok) { setStatus(box, 'error', box.dataset.errorLabel); return; }
      store(code);
      document.querySelectorAll('[data-discount-coupon]').forEach(function (other) {
        setStatus(other, 'applied', other.dataset.appliedLabel);
      });
      hydrate();
    });
  }

  function clear(box) {
    register('REMOVER-CUPOM').then(function () {
      store('');
      document.querySelectorAll('[data-discount-coupon]').forEach(function (other) {
        var input = other.querySelector('[data-discount-coupon-input]');
        if (input) input.value = '';
        setStatus(other, '', '');
      });
      hydrate();
    });
  }

  document.addEventListener('click', function (event) {
    var applyButton = event.target.closest('[data-discount-coupon-apply]');
    if (applyButton) { event.preventDefault(); apply(applyButton.closest('[data-discount-coupon]')); return; }
    var clearButton = event.target.closest('[data-discount-coupon-clear]');
    if (clearButton) { event.preventDefault(); clear(clearButton.closest('[data-discount-coupon]')); }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' || !event.target.matches('[data-discount-coupon-input]')) return;
    event.preventDefault();
    apply(event.target.closest('[data-discount-coupon]'));
  });

  // O drawer recria o HTML do carrinho a cada atualização: reaplica o estado salvo.
  var drawerContent = document.querySelector('[data-cart-drawer-content]');
  if (drawerContent && window.MutationObserver) {
    new MutationObserver(hydrate).observe(drawerContent, { childList: true });
  }
  document.addEventListener('DOMContentLoaded', hydrate);
})();
