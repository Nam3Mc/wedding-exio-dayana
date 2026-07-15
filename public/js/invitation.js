const envelopeOverlay = document.getElementById('sobreOverlay');
const envelopeButton = document.getElementById('sobreBtn');

function openInvitation() {
    envelopeOverlay?.classList.add('hidden');
    envelopeOverlay?.setAttribute('aria-hidden', 'true');
}

envelopeButton?.addEventListener('click', openInvitation);
envelopeButton?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openInvitation();
    }
});

const weddingDate = new Date('2027-01-08T18:00:00-05:00');
const countdownFields = {
    days: document.getElementById('dias'),
    hours: document.getElementById('horas'),
    minutes: document.getElementById('minutos'),
    seconds: document.getElementById('segundos')
};

function updateCountdown() {
    const difference = Math.max(0, weddingDate.getTime() - Date.now());
    const totalSeconds = Math.floor(difference / 1000);

    countdownFields.days.textContent = String(Math.floor(totalSeconds / 86400));
    countdownFields.hours.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0');
    countdownFields.minutes.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    countdownFields.seconds.textContent = String(totalSeconds % 60).padStart(2, '0');
}

if (countdownFields.days) {
    updateCountdown();
    window.setInterval(updateCountdown, 1000);
}
