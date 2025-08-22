import React, { useState, useEffect } from 'react';
import { supabaseClient } from '../lib/supabase';
import ReactModal from 'react-modal';
import toast from 'react-hot-toast';
import bcrypt from 'bcryptjs';

interface Usuario {
  id: string;
  username: string;
  role: string;
  full_name?: string;
  email?: string;
  active: boolean;
  last_login?: string;
  created_at: string;
}

interface UserForm {
  username: string;
  full_name: string;
  email: string;
  role: string;
  active: boolean;
  password: string;
  confirm: string;
}

const VerUsuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<null | Usuario>(null);
  const [showDelete, setShowDelete] = useState<null | Usuario>(null);
  const [saving, setSaving] = useState(false);

  // form state
  const emptyForm: UserForm = { username: '', full_name: '', email: '', role: 'user', active: true, password: '', confirm: '' };
  const [form, setForm] = useState<UserForm>({ ...emptyForm });

  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        setCargando(true);
        setError(null);
        
        // Consulta de solo lectura a la tabla de usuarios
        const { data, error } = await supabaseClient
          .from('usuarios')
          .select('id, username, role, full_name, email, active, last_login, created_at')
          .order('role', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        setUsuarios(data || []);
      } catch (err: any) {
        console.error('Error al cargar usuarios:', err);
        setError(err.message || 'Error al cargar usuarios');
      } finally {
        setCargando(false);
      }
    };

    cargarUsuarios();
  }, []);

  const reload = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabaseClient
        .from('usuarios')
        .select('id, username, role, full_name, email, active, last_login, created_at')
        .order('role', { ascending: false });
      if (error) throw error;
      setUsuarios(data || []);
    } catch (e: any) {
      toast.error(e.message || 'Error al recargar usuarios');
    } finally {
      setCargando(false);
    }
  };

  const openCreate = () => {
    setForm({ ...emptyForm });
    setShowCreate(true);
  };

  const openEdit = (u: Usuario) => {
    setForm({
      username: u.username,
      full_name: u.full_name || '',
      email: u.email || '',
      role: u.role,
      active: !!u.active,
      password: '',
      confirm: ''
    });
    setShowEdit(u);
  };

  const handleCreate = async () => {
    try {
      if (!form.username || !form.password) {
        toast.error('Usuario y contraseña son obligatorios');
        return;
      }
      if (form.password !== form.confirm) {
        toast.error('Las contraseñas no coinciden');
        return;
      }
      setSaving(true);
      const password_hash = await bcrypt.hash(form.password, 10);
      const { error } = await supabaseClient.from('usuarios').insert({
        username: form.username,
        password_hash,
        role: form.role,
        full_name: form.full_name || null,
        email: form.email || null,
        active: form.active
      });
      if (error) throw error;
      toast.success('Usuario creado');
      setShowCreate(false);
      await reload();
    } catch (e: any) {
      toast.error(e.message || 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!showEdit) return;
    try {
      setSaving(true);
      const updateData: any = {
        username: form.username,
        role: form.role,
        full_name: form.full_name || null,
        email: form.email || null,
        active: form.active
      };
      if (form.password) {
        if (form.password !== form.confirm) {
          toast.error('Las contraseñas no coinciden');
          setSaving(false);
          return;
        }
        updateData.password_hash = await bcrypt.hash(form.password, 10);
      }
      const { error } = await supabaseClient.from('usuarios').update(updateData).eq('id', showEdit.id);
      if (error) throw error;
      toast.success('Usuario actualizado');
      setShowEdit(null);
      await reload();
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      setSaving(true);
      const { error } = await supabaseClient.from('usuarios').delete().eq('id', showDelete.id);
      if (error) throw error;
      toast.success('Usuario eliminado');
      setShowDelete(null);
      await reload();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar usuario');
    } finally {
      setSaving(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md my-4">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 text-center">Usuarios del Sistema</h1>
      
      <div className="flex justify-end mb-4">
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Agregar usuario
        </button>
      </div>

      {usuarios.length === 0 ? (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-md">
          <p>No se encontraron usuarios en el sistema.</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-gray-600">Total de usuarios: {usuarios.length}</p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left border-b">Usuario</th>
                  <th className="py-3 px-4 text-left border-b">Rol</th>
                  <th className="py-3 px-4 text-left border-b">Nombre</th>
                  <th className="py-3 px-4 text-left border-b">Email</th>
                  <th className="py-3 px-4 text-left border-b">Estado</th>
                  <th className="py-3 px-4 text-left border-b">Último Acceso</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b">{usuario.username}</td>
                    <td className="py-3 px-4 border-b">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                        ${usuario.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                          usuario.role === 'user' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {usuario.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-b">{usuario.full_name || '-'}</td>
                    <td className="py-3 px-4 border-b">{usuario.email || '-'}</td>
                    <td className="py-3 px-4 border-b">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                        ${usuario.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {usuario.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-b">
                      {usuario.last_login ? new Date(usuario.last_login).toLocaleString() : 'Nunca'}
                    </td>
                    <td className="py-3 px-4 border-b text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
                          onClick={() => openEdit(usuario)}
                        >
                          Editar
                        </button>
                        <button
                          className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                          onClick={() => setShowDelete(usuario)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Detalle de Usuarios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {usuarios.map((usuario) => (
                <div key={`detail-${usuario.id}`} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold">{usuario.username}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                      ${usuario.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                        usuario.role === 'user' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                      {usuario.role}
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <p><span className="font-semibold">Nombre:</span> {usuario.full_name || 'No especificado'}</p>
                    <p><span className="font-semibold">Email:</span> {usuario.email || 'No especificado'}</p>
                    <p><span className="font-semibold">Estado:</span> {usuario.active ? 'Activo' : 'Inactivo'}</p>
                    <p><span className="font-semibold">Último acceso:</span> {usuario.last_login ? new Date(usuario.last_login).toLocaleString() : 'Nunca'}</p>
                    <p><span className="font-semibold">Creado:</span> {new Date(usuario.created_at).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2 truncate"><span className="font-semibold">ID:</span> {usuario.id}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Modales */}
      <CreateUserModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        form={form}
        setForm={setForm}
        onSave={handleCreate}
        saving={saving}
      />
      <EditUserModal
        isOpen={!!showEdit}
        onClose={() => setShowEdit(null)}
        form={form}
        setForm={setForm}
        onSave={handleEdit}
        saving={saving}
      />
      <DeleteUserModal
        isOpen={!!showDelete}
        onClose={() => setShowDelete(null)}
        user={showDelete}
        onConfirm={handleDelete}
        saving={saving}
      />
    </div>
  );
};

export default VerUsuarios;

// Modales
// Create Modal
const CreateUserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  form: UserForm;
  setForm: React.Dispatch<React.SetStateAction<UserForm>>;
  onSave: () => Promise<void> | void;
  saving: boolean;
}> = ({ isOpen, onClose, form, setForm, onSave, saving }) => (
  <ReactModal
    isOpen={isOpen}
    onRequestClose={onClose}
    className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 max-w-lg mx-auto mt-20 outline-none"
    overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
    ariaHideApp={false}
  >
    <h2 className="text-xl font-bold mb-4">Agregar usuario</h2>
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium">Usuario</label>
        <input className="w-full border rounded px-3 py-2" value={form.username} onChange={e=>setForm(prev=>({...prev, username:e.target.value}))} />
      </div>
      <div>
        <label className="block text-sm font-medium">Nombre</label>
        <input className="w-full border rounded px-3 py-2" value={form.full_name} onChange={e=>setForm(prev=>({...prev, full_name:e.target.value}))} />
      </div>
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input className="w-full border rounded px-3 py-2" value={form.email} onChange={e=>setForm(prev=>({...prev, email:e.target.value}))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Rol</label>
          <select className="w-full border rounded px-3 py-2" value={form.role} onChange={e=>setForm(prev=>({...prev, role:e.target.value}))}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <div className="flex items-center gap-2 mt-6">
          <input id="active" type="checkbox" checked={form.active} onChange={e=>setForm(prev=>({...prev, active:e.target.checked}))} />
          <label htmlFor="active">Activo</label>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Contraseña</label>
          <input type="password" autoComplete="new-password" className="w-full border rounded px-3 py-2" value={form.password} onChange={e=>setForm(prev=>({...prev, password:e.target.value}))} />
        </div>
        <div>
          <label className="block text-sm font-medium">Confirmar</label>
          <input type="password" autoComplete="new-password" className="w-full border rounded px-3 py-2" value={form.confirm} onChange={e=>setForm(prev=>({...prev, confirm:e.target.value}))} />
        </div>
      </div>
    </div>
    <div className="flex justify-end gap-2 mt-6">
      <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Cancelar</button>
      <button disabled={saving} onClick={onSave} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">{saving? 'Guardando...' : 'Guardar'}</button>
    </div>
  </ReactModal>
);

// Edit Modal
const EditUserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  form: UserForm;
  setForm: React.Dispatch<React.SetStateAction<UserForm>>;
  onSave: () => Promise<void> | void;
  saving: boolean;
}> = ({ isOpen, onClose, form, setForm, onSave, saving }) => (
  <ReactModal
    isOpen={isOpen}
    onRequestClose={onClose}
    className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 max-w-lg mx-auto mt-20 outline-none"
    overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
    ariaHideApp={false}
  >
    <h2 className="text-xl font-bold mb-4">Editar usuario</h2>
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium">Usuario</label>
        <input className="w-full border rounded px-3 py-2" value={form.username} onChange={e=>setForm(prev=>({...prev, username:e.target.value}))} />
      </div>
      <div>
        <label className="block text-sm font-medium">Nombre</label>
        <input className="w-full border rounded px-3 py-2" value={form.full_name} onChange={e=>setForm(prev=>({...prev, full_name:e.target.value}))} />
      </div>
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input className="w-full border rounded px-3 py-2" value={form.email} onChange={e=>setForm(prev=>({...prev, email:e.target.value}))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Rol</label>
          <select className="w-full border rounded px-3 py-2" value={form.role} onChange={e=>setForm(prev=>({...prev, role:e.target.value}))}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <div className="flex items-center gap-2 mt-6">
          <input id="active2" type="checkbox" checked={form.active} onChange={e=>setForm(prev=>({...prev, active:e.target.checked}))} />
          <label htmlFor="active2">Activo</label>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Nueva contraseña (opcional)</label>
          <input type="password" autoComplete="new-password" className="w-full border rounded px-3 py-2" value={form.password} onChange={e=>setForm(prev=>({...prev, password:e.target.value}))} onKeyDown={(e)=>e.stopPropagation()} readOnly={false} />
        </div>
        <div>
          <label className="block text-sm font-medium">Confirmar</label>
          <input type="password" autoComplete="new-password" className="w-full border rounded px-3 py-2" value={form.confirm} onChange={e=>setForm(prev=>({...prev, confirm:e.target.value}))} onKeyDown={(e)=>e.stopPropagation()} readOnly={false} />
        </div>
      </div>
    </div>
    <div className="flex justify-end gap-2 mt-6">
      <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Cancelar</button>
      <button disabled={saving} onClick={onSave} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">{saving? 'Actualizar...' : 'Actualizar'}</button>
    </div>
  </ReactModal>
);

// Delete Modal
const DeleteUserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: Usuario | null;
  onConfirm: () => Promise<void> | void;
  saving: boolean;
}> = ({ isOpen, onClose, user, onConfirm, saving }) => (
  <ReactModal
    isOpen={isOpen}
    onRequestClose={onClose}
    className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 max-w-md mx-auto mt-20 outline-none"
    overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
    ariaHideApp={false}
  >
    <h2 className="text-xl font-bold mb-2 text-center">¿Eliminar usuario?</h2>
    <p className="text-center">Esta acción no se puede deshacer.</p>
    <p className="text-center mt-2 font-semibold">{user?.username}</p>
    <div className="flex justify-center gap-2 mt-6">
      <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Cancelar</button>
      <button disabled={saving} onClick={onConfirm} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">{saving? 'Eliminando...' : 'Eliminar'}</button>
    </div>
  </ReactModal>
);
