(() => {
  const state = new URLSearchParams(location.search).get('signup');
  if (!state || state === 'success') return;
  const eyebrow = document.querySelector('#signup-eyebrow');
  const title = document.querySelector('#signup-title');
  const message = document.querySelector('#signup-message');
  if (state === 'invalid') {
    eyebrow.textContent = 'Check the details';
    title.innerHTML = 'One more<br>step.';
    message.textContent = 'Please return to the signup form, enter a valid email address, and confirm your consent.';
    return;
  }
  if (state === 'unavailable') {
    eyebrow.textContent = 'Service setup in progress';
    title.innerHTML = 'Almost<br>ready.';
    message.textContent = 'The reader list is being connected. Please try again shortly or email hello@36seas.com.';
    return;
  }
  eyebrow.textContent = 'Signal interrupted';
  title.innerHTML = 'Please try<br>again.';
  message.textContent = 'We could not complete the signup. Please try again or email hello@36seas.com.';
})();
