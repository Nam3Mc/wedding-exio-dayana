// const body = document.body;
// const invitationContent = document.getElementById('invitationContent');
// const envelopeStage = document.getElementById('envelopeStage');
// const openInvitationButton = document.getElementById('openInvitationButton');
// const invitationId = body.dataset.invitationId || window.location.pathname;
// const envelopeStorageKey = `wedding-invitation-opened:${invitationId}`;

// function revealInvitation({ remember = true } = {}) {
//     envelopeStage?.classList.add('is-hidden');
//     envelopeStage?.setAttribute('aria-hidden', 'true');
//     invitationContent?.classList.add('is-visible');
//     body.classList.remove('envelope-open');

//     if (remember) {
//         try {
//             window.sessionStorage.setItem(envelopeStorageKey, 'true');
//         } catch {
//             // The invitation still works when browser storage is unavailable.
//         }
//     }
// }

// function shouldSkipEnvelope() {
//     const hasResponseMessage = new URLSearchParams(window.location.search).has('success') ||
//         new URLSearchParams(window.location.search).has('error');

//     if (hasResponseMessage) {
//         return true;
//     }

//     try {
//         return window.sessionStorage.getItem(envelopeStorageKey) === 'true';
//     } catch {
//         return false;
//     }
// }

// if (shouldSkipEnvelope()) {
//     revealInvitation({ remember: false });
// } else {
//     body.classList.add('envelope-open');
// }

// openInvitationButton?.addEventListener('click', () => revealInvitation());

// // Countdown
// const weddingDate = new Date('2027-01-08T18:00:00-05:00');
// const countdownElements = {
//     days: document.getElementById('days'),
//     hours: document.getElementById('hours'),
//     minutes: document.getElementById('minutes'),
//     seconds: document.getElementById('seconds')
// };

// function updateCountdown() {
//     const remainingMilliseconds = Math.max(0, weddingDate.getTime() - Date.now());
//     const remainingSeconds = Math.floor(remainingMilliseconds / 1000);

//     const days = Math.floor(remainingSeconds / 86400);
//     const hours = Math.floor((remainingSeconds % 86400) / 3600);
//     const minutes = Math.floor((remainingSeconds % 3600) / 60);
//     const seconds = remainingSeconds % 60;

//     if (countdownElements.days) {
//         countdownElements.days.textContent = String(days);
//         countdownElements.hours.textContent = String(hours).padStart(2, '0');
//         countdownElements.minutes.textContent = String(minutes).padStart(2, '0');
//         countdownElements.seconds.textContent = String(seconds).padStart(2, '0');
//     }
// }

// if (countdownElements.days) {
//     updateCountdown();
//     window.setInterval(updateCountdown, 1000);
// }

// // Scroll reveal
// const revealElements = document.querySelectorAll('.reveal-on-scroll');

// if ('IntersectionObserver' in window) {
//     const revealObserver = new IntersectionObserver((entries, observer) => {
//         entries.forEach((entry) => {
//             if (!entry.isIntersecting) {
//                 return;
//             }

//             entry.target.classList.add('is-revealed');
//             observer.unobserve(entry.target);
//         });
//     }, {
//         threshold: 0.13,
//         rootMargin: '0px 0px -45px'
//     });

//     revealElements.forEach((element) => revealObserver.observe(element));
// } else {
//     revealElements.forEach((element) => element.classList.add('is-revealed'));
// }

// // Gentle hero parallax
// const heroPhoto = document.querySelector('.hero-photo');
// let parallaxFrame = null;

// function updateHeroParallax() {
//     parallaxFrame = null;

//     if (!heroPhoto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
//         return;
//     }

//     const offset = Math.min(window.scrollY * 0.08, 50);
//     heroPhoto.style.setProperty('--hero-offset', `${offset}px`);
// }

// window.addEventListener('scroll', () => {
//     if (parallaxFrame === null) {
//         parallaxFrame = window.requestAnimationFrame(updateHeroParallax);
//     }
// }, { passive: true });

// // Decorative petals
// const petalField = document.getElementById('petalField');
// const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// if (petalField && !reducedMotion) {
//     const petalCount = window.innerWidth < 600 ? 8 : 14;

//     for (let index = 0; index < petalCount; index += 1) {
//         const petal = document.createElement('span');
//         const duration = 12 + Math.random() * 12;
//         const delay = Math.random() * -20;
//         const drift = `${Math.round((Math.random() - 0.5) * 220)}px`;

//         petal.className = 'floating-petal';
//         petal.style.left = `${Math.random() * 100}%`;
//         petal.style.animationDuration = `${duration}s`;
//         petal.style.animationDelay = `${delay}s`;
//         petal.style.setProperty('--drift', drift);
//         petal.style.transform = `scale(${0.55 + Math.random() * 0.8})`;
//         petalField.appendChild(petal);
//     }
// }

// // Attendance modal
// const confirmationModal = document.getElementById('confirmationModal');
// const attendanceModal = confirmationModal?.querySelector('.attendance-modal');
// const openConfirmationModalButton = document.getElementById('openConfirmationModal');
// const closeConfirmationModalButton = document.getElementById('closeConfirmationModal');
// const cancelConfirmationButton = document.getElementById('cancelConfirmation');
// const attendanceForm = document.getElementById('attendanceForm');
// const companionCheckboxes = Array.from(document.querySelectorAll('.companion-checkbox'));
// const selectedAttendeeCount = document.getElementById('selectedAttendeeCount');
// const selectedAttendeeLabel = document.getElementById('selectedAttendeeLabel');
// const submitConfirmationButton = document.getElementById('submitConfirmation');
// let previouslyFocusedElement = null;

// function updateAttendanceSummary() {
//     if (!attendanceForm || !selectedAttendeeCount || !selectedAttendeeLabel) {
//         return;
//     }

//     const primaryCount = Number(attendanceForm.dataset.primaryCount || 1);
//     const companionCount = companionCheckboxes.filter((checkbox) => checkbox.checked).length;
//     const total = primaryCount + companionCount;
//     const selectedMode = attendanceForm.querySelector('input[name="status"]:checked')?.value || 'CONFIRMED';
//     const isVirtual = selectedMode === 'VIRTUAL';

//     selectedAttendeeCount.textContent = String(total);
//     selectedAttendeeLabel.textContent = total === 1
//         ? (isVirtual ? 'persona conectada virtualmente' : 'persona confirmada')
//         : (isVirtual ? 'personas conectadas virtualmente' : 'personas confirmadas');
// }

// function getFocusableElements() {
//     if (!attendanceModal) {
//         return [];
//     }

//     return Array.from(attendanceModal.querySelectorAll(
//         'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
//     ));
// }

// function openConfirmationModal() {
//     if (!confirmationModal || !attendanceModal) {
//         return;
//     }

//     previouslyFocusedElement = document.activeElement;
//     confirmationModal.classList.add('is-open');
//     confirmationModal.setAttribute('aria-hidden', 'false');
//     body.classList.add('modal-open');
//     attendanceModal.focus();
//     updateAttendanceSummary();
// }

// function closeConfirmationModal() {
//     if (!confirmationModal) {
//         return;
//     }

//     confirmationModal.classList.remove('is-open');
//     confirmationModal.setAttribute('aria-hidden', 'true');
//     body.classList.remove('modal-open');
//     previouslyFocusedElement?.focus?.();
// }

// openConfirmationModalButton?.addEventListener('click', openConfirmationModal);
// closeConfirmationModalButton?.addEventListener('click', closeConfirmationModal);
// cancelConfirmationButton?.addEventListener('click', closeConfirmationModal);

// confirmationModal?.addEventListener('click', (event) => {
//     if (event.target === confirmationModal) {
//         closeConfirmationModal();
//     }
// });

// companionCheckboxes.forEach((checkbox) => {
//     checkbox.addEventListener('change', updateAttendanceSummary);
// });

// attendanceForm?.querySelectorAll('input[name="status"]').forEach((radio) => {
//     radio.addEventListener('change', updateAttendanceSummary);
// });

// document.addEventListener('keydown', (event) => {
//     if (!confirmationModal?.classList.contains('is-open')) {
//         return;
//     }

//     if (event.key === 'Escape') {
//         closeConfirmationModal();
//         return;
//     }

//     if (event.key !== 'Tab') {
//         return;
//     }

//     const focusableElements = getFocusableElements();

//     if (focusableElements.length === 0) {
//         return;
//     }

//     const firstElement = focusableElements[0];
//     const lastElement = focusableElements[focusableElements.length - 1];

//     if (event.shiftKey && document.activeElement === firstElement) {
//         event.preventDefault();
//         lastElement.focus();
//     } else if (!event.shiftKey && document.activeElement === lastElement) {
//         event.preventDefault();
//         firstElement.focus();
//     }
// });

// attendanceForm?.addEventListener('submit', () => {
//     if (!submitConfirmationButton) {
//         return;
//     }

//     submitConfirmationButton.disabled = true;
//     submitConfirmationButton.innerHTML = `
//         <span>Guardando respuesta…</span>
//         <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
//     `;
// });

// // Decline response: keep the final interface to only two actions while preventing accidental clicks.
// const declineForm = document.getElementById('declineForm');

// declineForm?.addEventListener('submit', (event) => {
//     const accepted = window.confirm(
//         '¿Confirmas que no podrás asistir? Esta respuesta no podrá modificarse desde la invitación.'
//     );

//     if (!accepted) {
//         event.preventDefault();
//         return;
//     }

//     const submitButton = declineForm.querySelector('button[type="submit"]');

//     if (submitButton) {
//         submitButton.disabled = true;
//     }
// });


const body = document.body;
const invitationContent = document.getElementById('invitationContent');
const envelopeStage = document.getElementById('envelopeStage');
const openInvitationButton = document.getElementById(
    'openInvitationButton'
);

const weddingAudio = document.getElementById('weddingAudio');
const musicToggle = document.getElementById('musicToggle');

const invitationId =
    body.dataset.invitationId || window.location.pathname;

const WEDDING_START = new Date('2027-01-08T19:00:00-05:00');
const WEDDING_END = new Date('2027-01-09T00:00:00-05:00');

let hasStartedWeddingMusic = false;

function updateMusicButton(isPlaying) {
    if (!musicToggle) {
        return;
    }

    const icon = musicToggle.querySelector('i');

    musicToggle.hidden = false;
    musicToggle.classList.toggle(
        'is-paused',
        !isPlaying
    );
    musicToggle.setAttribute(
        'aria-label',
        isPlaying
            ? 'Pausar música'
            : 'Reproducir música'
    );

    if (!icon) {
        return;
    }

    icon.classList.toggle(
        'fa-volume-high',
        isPlaying
    );
    icon.classList.toggle(
        'fa-volume-xmark',
        !isPlaying
    );
}

async function startWeddingMusic({
    restart = false
} = {}) {
    if (!weddingAudio) {
        return false;
    }

    try {
        weddingAudio.volume = 0.45;
        weddingAudio.muted = false;
        weddingAudio.setAttribute('playsinline', '');

        if (restart) {
            weddingAudio.currentTime = 0;
        }

        if (
            weddingAudio.readyState === 0 &&
            weddingAudio.networkState !==
                HTMLMediaElement.NETWORK_NO_SOURCE
        ) {
            weddingAudio.load();
        }

        await weddingAudio.play();

        hasStartedWeddingMusic = true;
        updateMusicButton(true);

        return true;
    } catch (error) {
        console.error(
            'No se pudo reproducir la música:',
            error
        );

        updateMusicButton(false);

        return false;
    }
}

function revealInvitation({
    playMusic = false
} = {}) {
    envelopeStage?.classList.add('is-hidden');
    envelopeStage?.setAttribute(
        'aria-hidden',
        'true'
    );
    invitationContent?.classList.add('is-visible');
    body.classList.remove('envelope-open');

    if (playMusic) {
        void startWeddingMusic({
            restart: !hasStartedWeddingMusic
        });
    } else {
        updateMusicButton(false);
    }
}

function hasResponseMessage() {
    const searchParams = new URLSearchParams(
        window.location.search
    );

    return (
        searchParams.has('success') ||
        searchParams.has('error')
    );
}

/*
 * El sobre aparece en cada carga normal.
 * Esto garantiza que el inicio de la música ocurra después
 * de una interacción real del invitado.
 */
if (hasResponseMessage()) {
    revealInvitation({
        playMusic: false
    });
} else {
    body.classList.add('envelope-open');
}

openInvitationButton?.addEventListener(
    'click',
    async () => {
        revealInvitation({
            playMusic: false
        });

        await startWeddingMusic({
            restart: true
        });
    }
);

musicToggle?.addEventListener(
    'click',
    async () => {
        if (!weddingAudio) {
            return;
        }

        if (weddingAudio.paused) {
            await startWeddingMusic();
            return;
        }

        weddingAudio.pause();
        updateMusicButton(false);
    }
);

weddingAudio?.addEventListener(
    'play',
    () => {
        updateMusicButton(true);
    }
);

weddingAudio?.addEventListener(
    'pause',
    () => {
        updateMusicButton(false);
    }
);

weddingAudio?.addEventListener(
    'error',
    () => {
        const mediaError = weddingAudio.error;

        console.error(
            'Error al cargar /audio/wedding-song.mp3',
            {
                code: mediaError?.code,
                message: mediaError?.message
            }
        );

        updateMusicButton(false);
    }
);

// Countdown
const countdownElements = {
    days: document.getElementById('days'),
    hours: document.getElementById('hours'),
    minutes: document.getElementById('minutes'),
    seconds: document.getElementById('seconds')
};

function updateCountdown() {
    const remainingMilliseconds = Math.max(
        0,
        WEDDING_START.getTime() - Date.now()
    );
    const remainingSeconds = Math.floor(
        remainingMilliseconds / 1000
    );

    const days = Math.floor(remainingSeconds / 86400);
    const hours = Math.floor(
        (remainingSeconds % 86400) / 3600
    );
    const minutes = Math.floor(
        (remainingSeconds % 3600) / 60
    );
    const seconds = remainingSeconds % 60;

    if (!countdownElements.days) {
        return;
    }

    countdownElements.days.textContent = String(days);
    countdownElements.hours.textContent = String(hours).padStart(2, '0');
    countdownElements.minutes.textContent = String(minutes).padStart(2, '0');
    countdownElements.seconds.textContent = String(seconds).padStart(2, '0');
}

if (countdownElements.days) {
    updateCountdown();
    window.setInterval(updateCountdown, 1000);
}

// Scroll reveal
const revealElements = document.querySelectorAll('.reveal-on-scroll');

if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.classList.add('is-revealed');
                observer.unobserve(entry.target);
            });
        },
        {
            threshold: 0.13,
            rootMargin: '0px 0px -45px'
        }
    );

    revealElements.forEach((element) => {
        revealObserver.observe(element);
    });
} else {
    revealElements.forEach((element) => {
        element.classList.add('is-revealed');
    });
}

// Gentle hero parallax
const heroPhoto = document.querySelector('.hero-photo');
let parallaxFrame = null;

function updateHeroParallax() {
    parallaxFrame = null;

    if (
        !heroPhoto ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
        return;
    }

    const offset = Math.min(window.scrollY * 0.08, 50);
    heroPhoto.style.setProperty('--hero-offset', `${offset}px`);
}

window.addEventListener(
    'scroll',
    () => {
        if (parallaxFrame === null) {
            parallaxFrame = window.requestAnimationFrame(
                updateHeroParallax
            );
        }
    },
    {
        passive: true
    }
);

// Decorative petals
const petalField = document.getElementById('petalField');
const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
).matches;

if (petalField && !reducedMotion) {
    const petalCount = window.innerWidth < 600 ? 8 : 14;

    for (let index = 0; index < petalCount; index += 1) {
        const petal = document.createElement('span');
        const duration = 12 + Math.random() * 12;
        const delay = Math.random() * -20;
        const drift = `${Math.round(
            (Math.random() - 0.5) * 220
        )}px`;

        petal.className = 'floating-petal';
        petal.style.left = `${Math.random() * 100}%`;
        petal.style.animationDuration = `${duration}s`;
        petal.style.animationDelay = `${delay}s`;
        petal.style.setProperty('--drift', drift);
        petal.style.transform =
            `scale(${0.55 + Math.random() * 0.8})`;

        petalField.appendChild(petal);
    }
}

// Calendar
function formatUtcForCalendar(date) {
    return date
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z');
}

function escapeCalendarValue(value) {
    return String(value)
        .replaceAll('\\', '\\\\')
        .replaceAll(',', '\\,')
        .replaceAll(';', '\\;')
        .replaceAll('\n', '\\n');
}

function downloadCalendarFile() {
    const now = new Date();
    const uid = `boda-exio-dayana-${invitationId}@wedding`;

    const calendarContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Exio y Dayana//Boda 2027//ES',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${escapeCalendarValue(uid)}`,
        `DTSTAMP:${formatUtcForCalendar(now)}`,
        `DTSTART:${formatUtcForCalendar(WEDDING_START)}`,
        `DTEND:${formatUtcForCalendar(WEDDING_END)}`,
        'SUMMARY:Boda de Exio y Dayana',
        'DESCRIPTION:Ceremonia y recepción de la boda de Exio y Dayana.',
        'LOCATION:La Terraza del Portón\\, Cúcuta\\, Norte de Santander',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob(
        [calendarContent],
        {
            type: 'text/calendar;charset=utf-8'
        }
    );

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = 'boda-exio-dayana.ics';
    link.hidden = true;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
}

// Attendance modal
const confirmationModal = document.getElementById('confirmationModal');
const attendanceModal = confirmationModal?.querySelector(
    '.attendance-modal'
);
const openConfirmationModalButton = document.getElementById(
    'openConfirmationModal'
);
const closeConfirmationModalButton = document.getElementById(
    'closeConfirmationModal'
);
const cancelConfirmationButton = document.getElementById(
    'cancelConfirmation'
);
const attendanceForm = document.getElementById('attendanceForm');
const companionCheckboxes = Array.from(
    document.querySelectorAll('.companion-checkbox')
);
const selectedAttendeeCount = document.getElementById(
    'selectedAttendeeCount'
);
const selectedAttendeeLabel = document.getElementById(
    'selectedAttendeeLabel'
);
const submitConfirmationButton = document.getElementById(
    'submitConfirmation'
);
const virtualGiftPanel = document.getElementById('virtualGiftPanel');
const addToCalendarButton = document.getElementById(
    'addToCalendarButton'
);
const copyFeedback = document.getElementById('copyFeedback');

let previouslyFocusedElement = null;

function getSelectedMode() {
    return attendanceForm?.querySelector(
        'input[name="status"]:checked'
    )?.value || 'CONFIRMED';
}

function updateVirtualGiftPanel() {
    if (!virtualGiftPanel) {
        return;
    }

    const isVirtual = getSelectedMode() === 'VIRTUAL';

    virtualGiftPanel.hidden = !isVirtual;
    virtualGiftPanel.classList.toggle('is-visible', isVirtual);
    virtualGiftPanel.setAttribute(
        'aria-hidden',
        String(!isVirtual)
    );
}

function updateAttendanceSummary() {
    if (
        !attendanceForm ||
        !selectedAttendeeCount ||
        !selectedAttendeeLabel
    ) {
        return;
    }

    const primaryCount = Number(
        attendanceForm.dataset.primaryCount || 1
    );
    const companionCount = companionCheckboxes.filter(
        (checkbox) => checkbox.checked
    ).length;
    const total = primaryCount + companionCount;
    const isVirtual = getSelectedMode() === 'VIRTUAL';

    selectedAttendeeCount.textContent = String(total);

    selectedAttendeeLabel.textContent = total === 1
        ? (
            isVirtual
                ? 'persona conectada virtualmente'
                : 'persona confirmada'
        )
        : (
            isVirtual
                ? 'personas conectadas virtualmente'
                : 'personas confirmadas'
        );

    updateVirtualGiftPanel();
}

function getFocusableElements() {
    if (!attendanceModal) {
        return [];
    }

    return Array.from(
        attendanceModal.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), ' +
            '[href], [tabindex]:not([tabindex="-1"])'
        )
    );
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

openConfirmationModalButton?.addEventListener(
    'click',
    openConfirmationModal
);
closeConfirmationModalButton?.addEventListener(
    'click',
    closeConfirmationModal
);
cancelConfirmationButton?.addEventListener(
    'click',
    closeConfirmationModal
);

confirmationModal?.addEventListener('click', (event) => {
    if (event.target === confirmationModal) {
        closeConfirmationModal();
    }
});

companionCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener(
        'change',
        updateAttendanceSummary
    );
});

attendanceForm?.querySelectorAll(
    'input[name="status"]'
).forEach((radio) => {
    radio.addEventListener(
        'change',
        updateAttendanceSummary
    );
});

addToCalendarButton?.addEventListener(
    'click',
    downloadCalendarFile
);

document.querySelectorAll('.copy-detail-button').forEach((button) => {
    button.addEventListener('click', async () => {
        const value = button.dataset.copyValue || '';

        if (!value) {
            return;
        }

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            } else {
                const temporaryInput = document.createElement(
                    'textarea'
                );

                temporaryInput.value = value;
                temporaryInput.setAttribute('readonly', '');
                temporaryInput.style.position = 'fixed';
                temporaryInput.style.opacity = '0';

                document.body.appendChild(temporaryInput);
                temporaryInput.select();

                const copied = document.execCommand('copy');
                temporaryInput.remove();

                if (!copied) {
                    throw new Error('No se pudo copiar el dato');
                }
            }

            if (copyFeedback) {
                copyFeedback.textContent =
                    'Dato bancario copiado correctamente.';
            }
        } catch {
            if (copyFeedback) {
                copyFeedback.textContent =
                    `Copia manualmente: ${value}`;
            }
        }
    });
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
    const lastElement =
        focusableElements[focusableElements.length - 1];

    if (
        event.shiftKey &&
        document.activeElement === firstElement
    ) {
        event.preventDefault();
        lastElement.focus();
    } else if (
        !event.shiftKey &&
        document.activeElement === lastElement
    ) {
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
        <i
            class="fa-solid fa-spinner fa-spin"
            aria-hidden="true"
        ></i>
    `;
});

// Decline response
const declineForm = document.getElementById('declineForm');

declineForm?.addEventListener('submit', (event) => {
    const accepted = window.confirm(
        '¿Confirmas que no podrás asistir? ' +
        'Esta respuesta no podrá modificarse desde la invitación.'
    );

    if (!accepted) {
        event.preventDefault();
        return;
    }

    const submitButton = declineForm.querySelector(
        'button[type="submit"]'
    );

    if (submitButton) {
        submitButton.disabled = true;
    }
});