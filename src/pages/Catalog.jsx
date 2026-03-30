import React, { useState } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Search, Filter, ChevronRight, CheckCircle, Zap, Thermometer, Wind, Plus, Trash2 } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import Modal from '../components/Modal';
import './Catalog.css';

function CatalogList() {
  const navigate = useNavigate();
  const { catalog, addEquipment, deleteEquipment, loading } = useCatalog();
  const [activeTab, setActiveTab] = useState('All');
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
     brand: '', series: '', type: 'AC', tons: '', btu: '', seer: '', afue: '', system_cost: '', retail_price: '', badge: 'Economy', decibels: ''
  });

  const tabs = ['All', 'AC', 'Furnace', 'Heat Pump'];
  const filteredData = activeTab === 'All' ? catalog : catalog.filter(item => item.type === activeTab);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleAddSubmit = async (e) => {
      e.preventDefault();
      await addEquipment({
          brand: formData.brand,
          series: formData.series,
          type: formData.type,
          tons: parseFloat(formData.tons) || null,
          btu: formData.btu || null,
          seer: parseFloat(formData.seer) || null,
          afue: formData.afue || null,
          system_cost: parseFloat(formData.system_cost) || 0,
          retail_price: parseFloat(formData.retail_price) || 0,
          badge: formData.badge,
          decibels: formData.decibels || null,
          image_class: formData.type === 'AC' ? 'ac-img-1' : formData.type === 'Furnace' ? 'furnace-img-1' : 'heatpump-img-1'
      });
      setIsAddModalOpen(false);
      setFormData({ brand: '', series: '', type: 'AC', tons: '', btu: '', seer: '', afue: '', system_cost: '', retail_price: '', badge: 'Economy', decibels: '' });
  };

  if (loading) return <div className="page-container flex-center"><h3>Loading Live Catalog...</h3></div>;

  return (
    <div className="page-container catalog-page">
      <header className="page-header">
        <div>
           <h1 className="page-title">Live Product Catalog</h1>
           <p className="page-subtitle">Manage inventory pricing and metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="primary-action-btn" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={18} /> Add Equipment
            </button>
        </div>
      </header>

      <div className="catalog-tabs">
        {tabs.map(tab => (
          <button 
             key={tab} 
             className={`catalog-tab ${activeTab === tab ? 'active' : ''}`}
             onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="catalog-grid">
        {filteredData.length === 0 && <p className="text-slate-500">No equipment found. Add some above!</p>}
        {filteredData.map(product => (
          <div key={product.id} className="product-card glass-panel" onClick={() => navigate(`/catalog/${product.id}`)}>
            <div className={`product-image-placeholder ${product.image_class || 'ac-img-1'}`}>
               <span className="badge-overlay">{product.badge || 'Standard'}</span>
               {product.type === 'AC' && <Wind size={48} className="product-icon" />}
               {product.type === 'Furnace' && <Thermometer size={48} className="product-icon" />}
               {product.type === 'Heat Pump' && <Zap size={48} className="product-icon" />}
            </div>
            <div className="product-info">
              <span className="product-type-label">{product.type}</span>
              <h3 className="product-name">{product.brand} {product.series}</h3>
              
              <div className="product-specs">
                 {product.seer && <span>SEER {product.seer}</span>}
                 {product.afue && <span>AFUE {product.afue}</span>}
                 {product.seer && <span className="dot">•</span>}
                 {product.afue && <span className="dot">•</span>}
                 {product.tons && <span>{product.tons} Ton</span>}
                 {product.btu && <span>{product.btu} BTU</span>}
              </div>

              <div className="product-footer">
                <span className="product-price">Cost: ${product.system_cost}</span>
                <ChevronRight size={18} className="text-primary-600" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Add Equipment Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Database Equipment">
        <form onSubmit={handleAddSubmit} className="modal-form">
          <div className="grid grid-cols-2 gap-4">
             <div className="form-group">
                <label htmlFor="brand">Brand</label>
                <input id="brand" className="input-field" value={formData.brand} onChange={handleInputChange} required />
             </div>
             <div className="form-group">
                <label htmlFor="series">Series / Model</label>
                <input id="series" className="input-field" value={formData.series} onChange={handleInputChange} required />
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="form-group">
                <label htmlFor="type">System Type</label>
                <select id="type" className="input-field" value={formData.type} onChange={handleInputChange}>
                   <option>AC</option><option>Furnace</option><option>Heat Pump</option>
                </select>
             </div>
             <div className="form-group">
                <label htmlFor="badge">Retail Marketing Badge</label>
                <select id="badge" className="input-field" value={formData.badge} onChange={handleInputChange}>
                   <option>Ultra Premium</option><option>Best Value</option><option>Economy</option><option>High Efficiency</option>
                </select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="form-group">
                <label htmlFor="tons">Tonnage</label>
                <input id="tons" type="number" step="0.5" className="input-field" value={formData.tons} onChange={handleInputChange} />
             </div>
             <div className="form-group">
                <label htmlFor="btu">BTU</label>
                <input id="btu" className="input-field" value={formData.btu} onChange={handleInputChange} placeholder="e.g. 60k" />
             </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
             <div className="form-group"><label htmlFor="seer">SEER2</label><input id="seer" type="number" step="0.1" className="input-field" value={formData.seer} onChange={handleInputChange} /></div>
             <div className="form-group"><label htmlFor="afue">AFUE</label><input id="afue" className="input-field" value={formData.afue} onChange={handleInputChange} /></div>
             <div className="form-group"><label htmlFor="decibels">Decibels</label><input id="decibels" className="input-field" value={formData.decibels} onChange={handleInputChange} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="form-group">
                <label htmlFor="system_cost">Dealer Cost (System)</label>
                <input id="system_cost" type="number" step="0.01" className="input-field" value={formData.system_cost} onChange={handleInputChange} required />
             </div>
             <div className="form-group">
                <label htmlFor="retail_price">Catalog Retail Demo Price</label>
                <input id="retail_price" type="number" step="0.01" className="input-field" value={formData.retail_price} onChange={handleInputChange} />
             </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save to Database</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

function CatalogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { catalog, deleteEquipment } = useCatalog();
  const product = catalog.find(p => p.id.toString() === id);

  if (!product) return <div className="page-container"><h2>Product Not Found</h2><button onClick={() => navigate('/catalog')}>Back</button></div>;

  const handleDelete = async () => {
      if (window.confirm(`Are you sure you want to permanently delete this ${product.brand} unit?`)) {
          await deleteEquipment(product.id);
          navigate('/catalog');
      }
  };

  return (
     <div className="page-container catalog-detail">
       <button className="back-btn" onClick={() => navigate('/catalog')}>
        <ChevronRight size={18} className="icon-flip" /> Back to Dashboard
      </button>

      <div className="detail-hero glass-panel" style={{ position: 'relative' }}>
         <button onClick={handleDelete} title="Delete Equipment" style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Trash2 size={24} />
         </button>

         <div className={`hero-image-placeholder ${product.image_class || 'ac-img-1'}`}>
            {product.type === 'AC' && <Wind size={100} className="hero-product-icon" />}
            {product.type === 'Furnace' && <Thermometer size={100} className="hero-product-icon" />}
            {product.type === 'Heat Pump' && <Zap size={100} className="hero-product-icon" />}
         </div>
         <div className="hero-info">
            <span className="tag mb-2">{product.badge || 'Standard'}</span>
            <h1 className="hero-product-name">{product.brand} {product.series}</h1>
            <p className="hero-product-type">{product.type} System</p>
            <div className="hero-price">
              <span className="price-label">Dealer Baseline Cost</span>
              <span className="price-value">${product.system_cost || '0.00'}</span>
            </div>
         </div>
      </div>

      <div className="specs-grid">
         <div className="spec-card glass-panel">
           <Zap size={24} className="text-primary-500 mb-2" />
           <h3 className="spec-title">Efficiency</h3>
           <p className="spec-value">{product.seer ? `SEER2 ${product.seer}` : `AFUE ${product.afue || 'N/A'}`}</p>
         </div>
         <div className="spec-card glass-panel">
           <Wind size={24} className="text-primary-500 mb-2" />
           <h3 className="spec-title">Capacity Size</h3>
           <p className="spec-value">{product.tons ? `${product.tons} Ton` : `${product.btu || 'N/A'} BTU`}</p>
         </div>
         <div className="spec-card glass-panel">
            <CheckCircle size={24} className="text-primary-500 mb-2" />
            <h3 className="spec-title">Sound Level</h3>
            <p className="spec-value">{product.decibels || 'Standard dB'}</p>
         </div>
      </div>
     </div>
  );
}

export default function Catalog() {
  return (
    <Routes>
      <Route path="/" element={<CatalogList />} />
      <Route path="/:id" element={<CatalogDetail />} />
    </Routes>
  );
}
