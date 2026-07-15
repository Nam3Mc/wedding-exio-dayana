function copyInvitationLink(invitationId) {
    const invitationUrl = `${window.location.origin}/invitation/${invitationId}`;

    navigator.clipboard.writeText(invitationUrl)
        .then(() => {
            window.alert('Enlace copiado correctamente.');
        })
        .catch(() => {
            window.prompt('Copia este enlace:', invitationUrl);
        });
}

function confirmInvitationDeletion(event, guestName) {
    const confirmed = window.confirm(
        `¿Deseas eliminar la invitación de ${guestName}?`
    );

    if (!confirmed) {
        event.preventDefault();
    }
}

window.copyInvitationLink = copyInvitationLink;
window.confirmInvitationDeletion = confirmInvitationDeletion;

const loadedGuests = new Set();

async function toggleGuests(invitationId) {

    const row = document.getElementById(
        `guests-row-${invitationId}`
    );

    const container = document.getElementById(
        `guests-container-${invitationId}`
    );

    const arrow = document.getElementById(
        `arrow-${invitationId}`
    );

    const opened = row.style.display === 'table-row';

    if (opened) {

        row.style.display = 'none';

        arrow.classList.remove('rotate');

        return;
    }

    row.style.display = 'table-row';

    arrow.classList.add('rotate');

    if (loadedGuests.has(invitationId)) {
        return;
    }

    try {

        const response = await fetch(
            `/admin/invitations/${invitationId}/guests`
        );

        if (!response.ok) {
            throw new Error();
        }

        const guests = await response.json();

        container.innerHTML = guests.map((guest) => `

            <div class="guest-item">

                <div class="guest-name">

                    ${
                        guest.is_primary
                            ? '<strong>Invitado principal</strong><br>'
                            : ''
                    }

                    ${guest.name}

                </div>

                <div class="guest-status">

                    ${
                        guest.is_attending === true

                            ? '<span class="guest-confirmed">🟢 Asiste</span>'

                            : guest.is_attending === false

                                ? '<span class="guest-rejected">🔴 No asiste</span>'

                                : '<span class="guest-pending">🟡 Pendiente</span>'
                    }

                </div>

            </div>

        `).join('');

        loadedGuests.add(invitationId);

    } catch {

        container.innerHTML = `

            <div class="guest-error">

                No fue posible cargar los invitados.

            </div>

        `;
    }

}

window.toggleGuests = toggleGuests;