/**
 * AcxiomCRM Client-Side Real-Time Validation Engine
 * Enforces PDF Section 5.1 & Section 17.8 Acceptance Criteria
 */

document.addEventListener('DOMContentLoaded', () => {
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const PHONE_REGEX = /^[0-9]{10}$/;

  function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  function clearError(input) {
    input.classList.remove('is-invalid');
    const existing = input.parentNode.querySelector('.invalid-feedback-custom');
    if (existing) existing.remove();
  }

  function showError(input, message) {
    clearError(input);
    input.classList.add('is-invalid');
    const errorSpan = document.createElement('span');
    errorSpan.className = 'invalid-feedback-custom';
    errorSpan.innerText = message;
    input.parentNode.appendChild(errorSpan);
  }

  // Bind forms with class 'needs-crm-validation'
  const forms = document.querySelectorAll('form.needs-crm-validation');

  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      let isValid = true;

      // 1. Required fields
      const requiredInputs = form.querySelectorAll('[required]');
      requiredInputs.forEach(input => {
        if (!input.value.trim()) {
          showError(input, (input.dataset.name || 'This field') + ' is required.');
          isValid = false;
        } else {
          clearError(input);
        }
      });

      // 2. Email Validation
      const emailInputs = form.querySelectorAll('input[type="email"]');
      emailInputs.forEach(input => {
        if (input.value.trim() && !EMAIL_REGEX.test(input.value.trim())) {
          showError(input, 'Enter a valid email address (e.g. name@domain.com).');
          isValid = false;
        }
      });

      // 3. Phone Validation (10-digit mobile)
      const phoneInputs = form.querySelectorAll('input[name="Phone"], input[data-type="phone"]');
      phoneInputs.forEach(input => {
        const clean = input.value.replace(/[\s-]/g, '');
        if (clean && !PHONE_REGEX.test(clean)) {
          showError(input, 'Enter a valid 10-digit mobile number (e.g. 9876543210).');
          isValid = false;
        }
      });

      // 4. Opportunity Amount > 0
      const amountInput = form.querySelector('input[name="Amount"]');
      if (amountInput) {
        const val = parseFloat(amountInput.value);
        if (isNaN(val) || val <= 0) {
          showError(amountInput, 'Opportunity Amount must be greater than 0.');
          isValid = false;
        }
      }

      // 5. Probability (0 - 100)
      const probInput = form.querySelector('input[name="Probability"]');
      if (probInput) {
        const val = parseInt(probInput.value);
        if (isNaN(val) || val < 0 || val > 100) {
          showError(probInput, 'Probability must be between 0 and 100.');
          isValid = false;
        }
      }

      // 6. Expected Close Date (cannot be in the past)
      const closeDateInput = form.querySelector('input[name="ExpectedCloseDate"]');
      if (closeDateInput && closeDateInput.value) {
        if (closeDateInput.value < getTodayString()) {
          showError(closeDateInput, 'Expected Close Date cannot be in the past.');
          isValid = false;
        }
      }

      // 7. Follow-Up Date (cannot be earlier than today for planned follow-up)
      const followUpDateInput = form.querySelector('input[name="FollowUpDate"]');
      if (followUpDateInput && followUpDateInput.value) {
        if (followUpDateInput.value < getTodayString()) {
          showError(followUpDateInput, 'Follow-up date cannot be earlier than today.');
          isValid = false;
        }
      }

      if (!isValid) {
        e.preventDefault();
        e.stopPropagation();
        // Focus first invalid input
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus();
      }
    });

    // Real-time input clearing on typing
    form.querySelectorAll('input, select, textarea').forEach(input => {
      input.addEventListener('input', () => {
        if (input.classList.contains('is-invalid')) {
          clearError(input);
        }
      });
    });
  });
});
