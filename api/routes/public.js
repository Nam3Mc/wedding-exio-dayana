import { Router } from 'express';

export default (pool) => {
  const router = Router();

  // GET: Obtener datos de una invitación (público)
  router.get('/invitation/:uuid', async (req, res) => {
    const { uuid } = req.params;
    try {
      // Buscar la invitación
      const invResult = await pool.query(
        'SELECT * FROM invitations WHERE id = $1',
        [uuid]
      );
      if (invResult.rowCount === 0) {
        return res.status(404).json({ error: 'Invitación no encontrada' });
      }
      const invitation = invResult.rows[0];

      // Verificar si expiró (si está PENDING y la fecha ya pasó)
      const now = new Date();
      const expiration = new Date(invitation.expiration_date);
      if (invitation.group_status === 'PENDING' && now > expiration) {
        // Actualizar estado a EXPIRED
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

  // POST: Enviar respuesta (confirmar asistentes)
  router.post('/respond', async (req, res) => {
    const { uuid, responses } = req.body;
    if (!uuid || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verificar que la invitación existe y no está expirada
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
      if (invitation.group_status === 'PENDING' && now > expiration) {
        await client.query('ROLLBACK');
        return res.status(410).json({ error: 'La invitación ha expirado' });
      }

      // Actualizar cada familiar
      for (const resp of responses) {
        await client.query(
          'UPDATE family_members SET is_attending = $1 WHERE id = $2 AND invitation_id = $3',
          [resp.is_attending, resp.id, uuid]
        );
      }

      // Calcular nuevo estado del grupo
      const stats = await client.query(
        `SELECT 
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE is_attending = true) AS attending,
          COUNT(*) FILTER (WHERE is_attending = false OR is_attending IS NULL) AS not_attending
         FROM family_members WHERE invitation_id = $1`,
        [uuid]
      );
      const { total, attending, not_attending } = stats.rows[0];
      let newStatus = 'PENDING';
      if (attending > 0) {
        newStatus = 'CONFIRMED';
      } else if (not_attending === total && total > 0) {
        newStatus = 'REJECTED';
      }

      await client.query(
        'UPDATE invitations SET group_status = $1, updated_at = NOW() WHERE id = $2',
        [newStatus, uuid]
      );

      await client.query('COMMIT');
      res.json({
        message: 'Respuesta guardada correctamente',
        status: newStatus
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