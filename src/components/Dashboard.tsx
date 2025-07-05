import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Header from './layout/Header';
import Navigation from './layout/Navigation';
import DashboardView from './views/DashboardView';
import ArticlesView from './views/ArticlesView';
import MovementsView from './views/MovementsView';
import ExistenciasView from './views/ExistenciasView';
import ControlCardView from './views/ControlCardView';
import ImportExportView from './views/ImportExportView';
import PapeleriaNuevaView from './views/PapeleriaNuevaView';

export type ViewType = 'dashboard' | 'articles' | 'movements' | 'existencias' | 'control-card' | 'papeleria-nueva' | 'import-export';

const Dashboard = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  const renderView = () => {
    const viewComponents = {
      dashboard: DashboardView,
      articles: ArticlesView,
      movements: MovementsView,
      existencias: ExistenciasView,
      'control-card': ControlCardView,
      'papeleria-nueva': PapeleriaNuevaView,
      'import-export': ImportExportView,
    };

    const ViewComponent = viewComponents[currentView];
    
    return (
      <motion.div
        key={currentView}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="flex-1"
      >
        <ViewComponent />
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderView()}
      </main>
    </div>
  );
};

export default Dashboard;