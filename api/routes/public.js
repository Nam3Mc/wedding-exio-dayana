import { Router } from 'express';

export default (pool) => {
  const router = Router();

  // GET – obtener datos de una invitación (público)
  router.get('/invitation/:uuid', async (req, res) => {
    const { uuid } = req.params;
    try {
      // Verificar existencia
      const invResult = await pool.query(
        'SELECT * FROM invitations WHERE id = $1',
        [uuid]
      );
      if (invResult.rowCount === 0) {
        return res.status(404).json({ error: 'Invitación no encontrada' });
      }
      const invitation = invResult.rows[0];

      // Actualizar a EXPIRED si la fecha ya pasó y está PENDING
      const now = new Date();
      const expiration = new Date(invitation.expiration_date);
      if (invitation.group_status === 'PENDING' && now > expiration) {
        await pool.query(
          'UPDATE invitations SET group_status = $1 WHERE id = $2',
          ['EXPIRED', uuid]
        );
        invitation.group_status = 'EXPIRED';
      }

      // Obtener familiares
      const familyResult = await pool.query(
        'SELECT id, name, is_attending FROM family_members WHERE invitation_id = $1',
        [uuid]
      );

      res.json({
        invitation: {
          id: invitation.id,
          primary_guest: invitation.primary_guest,
          is_foreign: invitation.is_foreign,
          expiration_date: invitation.expiration_date,
          group_status: invitation.group_status,
          max_attendees: invitation.max_attendees,
        },
        family_members: familyResult.rows
      });
    } catch (error) {
      console.error('Error al obtener invitación pública:', error);
      res.status(500).json({ error: 'Error al obtener invitación' });
    }
  });

  // POST – enviar respuesta (confirmar asistencia)
  router.post('/respond', async (req, res) => {
    const { uuid, responses, status } = req.body;

    if (!uuid) {
      return res.status(400).json({ error: 'Falta el identificador de la invitación' });
    }

    // Validar status: debe ser CONFIRMED, VIRTUAL o REJECTED
    const allowedStatuses = ['CONFIRMED', 'VIRTUAL', 'REJECTED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado de confirmación inválido' });
    }

    if (!Array.isArray(responses)) {
      return res.status(400).json({ error: 'Las respuestas deben ser un arreglo' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verificar que la invitación existe y no está expirada o ya respondida
      const invResult = await client.query(
        'SELECT id, group_status, expiration_date FROM invitations WHERE id = $1',
        [uuid]
      );
      if (invResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Invitación no encontrada' });
      }

      const invitation = invResult.rows[0];
      const now = new Date();
      const expiration = new Date(invitation.expiration_date);

      // Si ya está EXPIRED, rechazar
      if (invitation.group_status === 'EXPIRED') {
        await client.query('ROLLBACK');
        return res.status(410).json({ error: 'La invitación ha expirado' });
      }

      // Si ya no está PENDING (ya fue respondida), rechazar
      if (invitation.group_status !== 'PENDING') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Esta invitación ya fue respondida' });
      }

      // Si la fecha de expiración ya pasó y aún está PENDING, marcar EXPIRED y rechazar
      if (now > expiration) {
        await client.query(
          'UPDATE invitations SET group_status = $1 WHERE id = $2',
          ['EXPIRED', uuid]
        );
        await client.query('COMMIT');
        return res.status(410).json({ error: 'La invitación ha expirado' });
      }

      // Actualizar cada familiar (si se enviaron respuestas)
      for (const resp of responses) {
        await client.query(
          'UPDATE family_members SET is_attending = $1 WHERE id = $2 AND invitation_id = $3',
          [resp.is_attending, resp.id, uuid]
        );
      }

      // Actualizar el estado del grupo directamente con el status recibido
      await client.query(
        'UPDATE invitations SET group_status = $1, updated_at = NOW() WHERE id = $2',
        [status, uuid]
      );

      await client.query('COMMIT');
      res.json({
        message: 'Respuesta guardada correctamente',
        status: status
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al procesar respuesta:', error);
      res.status(500).json({ error: 'Error al procesar respuesta' });
    } finally {
      client.release();
    }
  });

  return router;
};