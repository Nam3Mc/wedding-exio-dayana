const body = document.body;
const invitationContent = document.getElementById('invitationContent');
const envelopeStage = document.getElementById('envelopeStage');
const openInvitationButton = document.getElementById('openInvitationButton');
const invitationId = body.dataset.invitationId || window.location.pathname;
const envelopeStorageKey = `wedding-invitation-opened:${invitationId}`;

function revealInvitation({ remember = true } = {}) {
    envelopeStage?.classList.add('is-hidden');
    envelopeStage?.setAttribute('aria-hidden', 'true');
    invitationContent?.classList.add('is-visible');
    body.classList.remove('envelope-open');

    if (remember) {
        try {
            window.sessionStorage.setItem(envelopeStorageKey, 'true');
        } catch {
            // The invitation still works when browser storage is unavailable.
        }
    }
}

function shouldSkipEnvelope() {
    const hasResponseMessage = new URLSearchParams(window.location.search).has('success') ||
        new URLSearchParams(window.location.search).has('error');

    if (hasResponseMessage) {
        return true;
    }

    try {
        return window.sessionStorage.getItem(envelopeStorageKey) === 'true';
    } catch {
        return false;
    }
}

if (shouldSkipEnvelope()) {
    revealInvitation({ remember: false });
} else {
    body.classList.add('envelope-open');
}

openInvitationButton?.addEventListener('click', () => revealInvitation());

// Countdown
const weddingDate = new Date('2027-01-08T18:00:00-05:00');
const countdownElements = {
    days: document.getElementById('days'),
    hours: document.getElementById('hours'),
    minutes: document.getElementById('minutes'),
    seconds: document.getElementById('seconds')
};

function updateCountdown() {
    const remainingMilliseconds = Math.max(0, weddingDate.getTime() - Date.now());
    const remainingSeconds = Math.floor(remainingMilliseconds / 1000);

    const days = Math.floor(remainingSeconds / 86400);
    const hours = Math.floor((remainingSeconds % 86400) / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    if (countdownElements.days) {
        countdownElements.days.textContent = String(days);
        countdownElements.hours.textContent = String(hours).padStart(2, '0');
        countdownElements.minutes.textContent = String(minutes).padStart(2, '0');
        countdownElements.seconds.textContent = String(seconds).padStart(2, '0');
    }
}

if (countdownElements.days) {
    updateCountdown();
    window.setInterval(updateCountdown, 1000);
}

// Scroll reveal
const revealElements = document.querySelectorAll('.reveal-on-scroll');

if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
        });
    }, {
        threshold: 0.13,
        rootMargin: '0px 0px -45px'
    });

    revealElements.forEach((element) => revealObserver.observe(element));
} else {
    revealElements.forEach((element) => element.classList.add('is-revealed'));
}

// Gentle hero parallax
const heroPhoto = document.querySelector('.hero-photo');
let parallaxFrame = null;

function updateHeroParallax() {
    parallaxFrame = null;

    if (!heroPhoto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const offset = Math.min(window.scrollY * 0.08, 50);
    heroPhoto.style.setProperty('--hero-offset', `${offset}px`);
}

window.addEventListener('scroll', () => {
    if (parallaxFrame === null) {
        parallaxFrame = window.requestAnimationFrame(updateHeroParallax);
    }
}, { passive: true });

// Decorative petals
const petalField = document.getElementById('petalField');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (petalField && !reducedMotion) {
    const petalCount = window.innerWidth < 600 ? 8 : 14;

    for (let index = 0; index < petalCount; index += 1) {
        const petal = document.createElement('span');
        const duration = 12 + Math.random() * 12;
        const delay = Math.random() * -20;
        const drift = `${Math.round((Math.random() - 0.5) * 220)}px`;

        petal.className = 'floating-petal';
        petal.style.left = `${Math.random() * 100}%`;
        petal.style.animationDuration = `${duration}s`;
        petal.style.animationDelay = `${delay}s`;
        petal.style.setProperty('--drift', drift);
        petal.style.transform = `scale(${0.55 + Math.random() * 0.8})`;
        petalField.appendChild(petal);
    }
}

// Attendance modal
const confirmationModal = document.getElementById('confirmationModal');
const attendanceModal = confirmationModal?.querySelector('.attendance-modal');
const openConfirmationModalButton = document.getElementById('openConfirmationModal');
const closeConfirmationModalButton = document.getElementById('closeConfirmationModal');
const cancelConfirmationButton = document.getElementById('cancelConfirmation');
const attendanceForm = document.getElementById('attendanceForm');
const companionCheckboxes = Array.from(document.querySelectorAll('.companion-checkbox'));
const selectedAttendeeCount = document.getElementById('selectedAttendeeCount');
const selectedAttendeeLabel = document.getElementById('selectedAttendeeLabel');
const submitConfirmationButton = document.getElementById('submitConfirmation');
let previouslyFocusedElement = null;

function updateAttendanceSummary() {
    if (!attendanceForm || !selectedAttendeeCount || !selectedAttendeeLabel) {
        return;
    }

    const primaryCount = Number(attendanceForm.dataset.primaryCount || 1);
    const companionCount = companionCheckboxes.filter((checkbox) => checkbox.checked).length;
    const total = primaryCount + companionCount;
    const selectedMode = attendanceForm.querySelector('input[name="status"]:checked')?.value || 'CONFIRMED';
    const isVirtual = selectedMode === 'VIRTUAL';

    selectedAttendeeCount.textContent = String(total);
    selectedAttendeeLabel.textContent = total === 1
        ? (isVirtual ? 'persona conectada virtualmente' : 'persona confirmada')
        : (isVirtual ? 'personas conectadas virtualmente' : 'personas confirmadas');
}

function getFocusableElements() {
    if (!attendanceModal) {
        return [];
    }

    return Array.from(attendanceModal.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    ));
}

function openConfirmationModal() {
    if (!confirmationModal || !attendanceModal) {
        return;
    }

    previouslyFocusedElement = document.activeElement;
    confirmationModal.classList.add('is-open');
    confirmationModal.setAttribute('aria-hidden', 'false');
    body.classList.add('modal-open');
    attendanceModal.focus();
    updateAttendanceSummary();
}

function closeConfirmationModal() {
    if (!confirmationModal) {
        return;
    }

    confirmationModal.classList.remove('is-open');
    confirmationModal.setAttribute('aria-hidden', 'true');
    body.classList.remove('modal-open');
    previouslyFocusedElement?.focus?.();
}

openConfirmationModalButton?.addEventListener('click', openConfirmationModal);
closeConfirmationModalButton?.addEventListener('click', closeConfirmationModal);
cancelConfirmationButton?.addEventListener('click', closeConfirmationModal);

confirmationModal?.addEventListener('click', (event) => {
    if (event.target === confirmationModal) {
        closeConfirmationModal();
    }
});

companionCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', updateAttendanceSummary);
});

attendanceForm?.querySelectorAll('input[name="status"]').forEach((radio) => {
    radio.addEventListener('change', updateAttendanceSummary);
});

document.addEventListener('keydown', (event) => {
    if (!confirmationModal?.classList.contains('is-open')) {
        return;
    }

    if (event.key === 'Escape') {
        closeConfirmationModal();
        return;
    }

    if (event.key !== 'Tab') {
        return;
    }

    const focusableElements = getFocusableElements();

    if (focusableElements.length === 0) {
        return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
    }
});

attendanceForm?.addEventListener('submit', () => {
    if (!submitConfirmationButton) {
        return;
    }

    submitConfirmationButton.disabled = true;
    submitConfirmationButton.innerHTML = `
        <span>Guardando respuesta…</span>
        <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
    `;
});

// Decline response: keep the final interface to only two actions while preventing accidental clicks.
const declineForm = document.getElementById('declineForm');

declineForm?.addEventListener('submit', (event) => {
    const accepted = window.confirm(
        '¿Confirmas que no podrás asistir? Esta respuesta no podrá modificarse desde la invitación.'
    );

    if (!accepted) {
        event.preventDefault();
        return;
    }

    const submitButton = declineForm.querySelector('button[type="submit"]');

    if (submitButton) {
        submitButton.disabled = true;
    }
});
