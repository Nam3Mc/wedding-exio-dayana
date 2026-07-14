import { Router } from 'express';

export default (pool, auth) => {
  const router = Router();

  // Aplicar middleware de autenticación a todas las rutas de admin
  router.use(auth);

  // GET: Listar todas las invitaciones con conteos
  router.get('/', async (req, res) => {
    try {
      const query = `
        SELECT 
          i.id,
          i.primary_guest,
          i.is_foreign,
          i.expiration_date,
          i.group_status,
          i.created_at,
          i.updated_at,
          i.max_attendees,
          COALESCE(
            (SELECT COUNT(*) FROM family_members fm WHERE fm.invitation_id = i.id AND fm.is_attending = true),
            0
          ) AS confirmed_attendees,
          COALESCE(
            (SELECT COUNT(*) FROM family_members fm WHERE fm.invitation_id = i.id),
            0
          ) AS total_family_members
        FROM invitations i
        ORDER BY i.created_at DESC
      `;
      const { rows } = await pool.query(query);
      res.json(rows);
    } catch (error) {
      console.error('Error al obtener invitaciones:', error);
      res.status(500).json({ error: 'Error al obtener invitaciones' });
    }
  });

  // POST: Crear nueva invitación
  router.post('/', async (req, res) => {
    const { primary_guest, family_members, is_foreign, expiration_date, max_attendees } = req.body;

    // Validaciones básicas
    if (!primary_guest || !family_members || !expiration_date) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    if (!Array.isArray(family_members) || family_members.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un familiar' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insertar invitación
      const insertInvitation = `
        INSERT INTO invitations 
          (primary_guest, is_foreign, expiration_date, max_attendees, group_status)
        VALUES ($1, $2, $3, $4, 'PENDING')
        RETURNING id
      `;
      const values = [
        primary_guest,
        is_foreign || false,
        expiration_date,
        max_attendees || null
      ];
      const { rows } = await client.query(insertInvitation, values);
      const invitationId = rows[0].id;

      // Insertar cada familiar
      for (const name of family_members) {
        await client.query(
          'INSERT INTO family_members (invitation_id, name) VALUES ($1, $2)',
          [invitationId, name]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({
        id: invitationId,
        message: 'Invitación creada exitosamente'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al crear invitación:', error);
      res.status(500).json({ error: 'Error al crear invitación' });
    } finally {
      client.release();
    }
  });

  // DELETE: Eliminar invitación (y familiares en cascada)
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('DELETE FROM invitations WHERE id = $1', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Invitación no encontrada' });
      }
      res.json({ message: 'Invitación eliminada exitosamente' });
    } catch (error) {
      console.error('Error al eliminar invitación:', error);
      res.status(500).json({ error: 'Error al eliminar invitación' });
    }
  });

  return router;
};