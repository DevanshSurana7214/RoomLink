import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setCurrentPerson } from '../api';

export default function Register({ onRegister }) {
  const [form, setForm] = useState({ name: '', roll_number: '', room_no: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.roll_number.trim() || !form.room_no.trim()) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    try {
      const person = await api.registerPerson(form);
      setCurrentPerson(person);
      onRegister(person);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="text-gray-500 mt-1">Join RoomLink and start finding paths</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              type="text"
              name="name"
              className="input-field"
              placeholder="e.g. Alice Chen"
              value={form.name}
              onChange={handleChange}
              autoFocus
            />
          </div>

          <div>
            <label className="label">Roll Number</label>
            <input
              type="text"
              name="roll_number"
              className="input-field"
              placeholder="e.g. CS22001"
              value={form.roll_number}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="label">Room Number</label>
            <input
              type="text"
              name="room_no"
              className="input-field"
              placeholder="e.g. A101"
              value={form.room_no}
              onChange={handleChange}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-4">
          Already have an account?{' '}
          <Link to="/" className="text-brand-600 hover:text-brand-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
