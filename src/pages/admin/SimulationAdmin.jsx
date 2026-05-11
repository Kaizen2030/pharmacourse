import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function SimulationAdmin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [simulations, setSimulations] = useState([])
  const [pearls, setPearls] = useState([])
  const [tab, setTab] = useState('simulations')
  const [loading, setLoading] = useState(false)
  const [newSim, setNewSim] = useState({ title: '', patient_context: '', difficulty: 'intermediate', competencies: [], antibiogram: {} })
  const [newPearl, setNewPearl] = useState({ title: '', content: '', category: '', tags: [] })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [simRes, pearlRes] = await Promise.all([
      supabase.from('case_simulations').select('*'),
      supabase.from('clinical_pearls').select('*')
    ])
    setSimulations(simRes.data || [])
    setPearls(pearlRes.data || [])
  }

  async function createSimulation() {
    if (!newSim.title || !newSim.patient_context) { alert('Please fill in title and patient context'); return }
    setLoading(true)
    const { error } = await supabase.from('case_simulations').insert({ ...newSim, created_by: user.id })
    if (error) alert('Error: ' + error.message)
    else { setNewSim({ title: '', patient_context: '', difficulty: 'intermediate', competencies: [], antibiogram: {} }); loadData() }
    setLoading(false)
  }

  async function deleteSimulation(id) {
    if (!confirm('Delete this simulation?')) return
    await supabase.from('case_simulations').delete().eq('id', id)
    loadData()
  }

  async function createPearl() {
    if (!newPearl.title || !newPearl.content || !newPearl.category) { alert('Please fill in all fields'); return }
    setLoading(true)
    const { error } = await supabase.from('clinical_pearls').insert({ ...newPearl, created_by: user.id })
    if (error) alert('Error: ' + error.message)
    else { setNewPearl({ title: '', content: '', category: '', tags: [] }); loadData() }
    setLoading(false)
  }

  async function deletePearl(id) {
    if (!confirm('Delete this pearl?')) return
    await supabase.from('clinical_pearls').delete().eq('id', id)
    loadData()
  }

  return (
    <div className='page'>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '.5rem' }}>Simulation Admin</h1>
        <p style={{ color: 'var(--text-500)', fontSize: '.95rem' }}>Manage case simulations and clinical pearls</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <button onClick={() => setTab('simulations')} style={{ background: tab === 'simulations' ? 'var(--green)' : 'transparent', color: tab === 'simulations' ? 'white' : 'var(--text-600)', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: tab === 'simulations' ? '600' : '500' }}>Case Simulations</button>
        <button onClick={() => setTab('pearls')} style={{ background: tab === 'pearls' ? 'var(--green)' : 'transparent', color: tab === 'pearls' ? 'white' : 'var(--text-600)', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: tab === 'pearls' ? '600' : '500' }}>Clinical Pearls</button>
      </div>

      {tab === 'simulations' && (
        <div>
          <div className='card' style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Create New Simulation</h2>
            <input value={newSim.title} onChange={e => setNewSim({ ...newSim, title: e.target.value })} placeholder='Case title' style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem' }} />
            <textarea value={newSim.patient_context} onChange={e => setNewSim({ ...newSim, patient_context: e.target.value })} placeholder='Patient context' style={{ width: '100%', minHeight: '120px', marginBottom: '1rem', padding: '0.75rem' }} />
            <select value={newSim.difficulty} onChange={e => setNewSim({ ...newSim, difficulty: e.target.value })} style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem' }}>
              <option>beginner</option>
              <option>intermediate</option>
              <option>advanced</option>
            </select>
            <button onClick={createSimulation} disabled={loading} className='btn btn-primary'>{loading ? 'Creating...' : 'Create Simulation'}</button>
          </div>

          <div>
            <h2 style={{ marginBottom: '1rem' }}>Existing Simulations</h2>
            {simulations.map(sim => (
              <div key={sim.id} className='card' style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div><h3 style={{ marginBottom: '.5rem' }}>{sim.title}</h3><p style={{ color: 'var(--text-500)', fontSize: '.9rem' }}>{sim.patient_context.substring(0, 100)}...</p></div>
                  <button onClick={() => deleteSimulation(sim.id)} className='btn btn-error' style={{ fontSize: '.85rem' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'pearls' && (
        <div>
          <div className='card' style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Create New Pearl</h2>
            <input value={newPearl.title} onChange={e => setNewPearl({ ...newPearl, title: e.target.value })} placeholder='Pearl title' style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem' }} />
            <input value={newPearl.category} onChange={e => setNewPearl({ ...newPearl, category: e.target.value })} placeholder='Category' style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem' }} />
            <textarea value={newPearl.content} onChange={e => setNewPearl({ ...newPearl, content: e.target.value })} placeholder='Pearl content' style={{ width: '100%', minHeight: '120px', marginBottom: '1rem', padding: '0.75rem' }} />
            <button onClick={createPearl} disabled={loading} className='btn btn-primary'>{loading ? 'Creating...' : 'Create Pearl'}</button>
          </div>

          <div>
            <h2 style={{ marginBottom: '1rem' }}>Existing Pearls</h2>
            {pearls.map(pearl => (
              <div key={pearl.id} className='card' style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div><h3 style={{ marginBottom: '.5rem' }}>{pearl.title}</h3><p style={{ color: 'var(--text-600)', fontSize: '.9rem', marginBottom: '.5rem' }}>{pearl.content}</p><p style={{ color: 'var(--text-500)', fontSize: '.85rem' }}>Category: {pearl.category}</p></div>
                  <button onClick={() => deletePearl(pearl.id)} className='btn btn-error' style={{ fontSize: '.85rem' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}