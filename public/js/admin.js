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
