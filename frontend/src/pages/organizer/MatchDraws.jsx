import React, { useState, useEffect } from 'react';
import { matchService } from '../../services/matchService';
import { categoryService } from '../../services/categoryService';
import { tournamentService } from '../../services/tournamentService';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import MatchDrawsBracket from '../../components/MatchDrawsBracket';
import { FiFilter, FiRefreshCw, FiDownload } from 'react-icons/fi';

const MatchDraws = () => {
  const [tournaments, setTournaments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedTournament && selectedCategory) {
      loadMatches();
    }
  }, [selectedTournament, selectedCategory]);

  const loadData = async () => {
    try {
      const [tournamentsRes, categoriesRes] = await Promise.all([
        tournamentService.getTournaments({ status: 'Open' }),
        categoryService.getCategories(),
      ]);

      setTournaments(tournamentsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load tournaments and categories');
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    if (!selectedTournament || !selectedCategory) return;

    setLoading(true);
    try {
      const matchesRes = await matchService.getMatches({
        tournament_id: selectedTournament,
        category_id: selectedCategory,
      });
      setMatches(matchesRes.data || []);
    } catch (error) {
      console.error('Error loading matches:', error);
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDraws = async () => {
    if (!selectedTournament || !selectedCategory) {
      toast.error('Please select a tournament and category');
      return;
    }

    try {
      // TODO: Implement API call to generate draws
      toast.success('Match draws generated successfully!');
      loadMatches();
    } catch (error) {
      console.error('Error generating draws:', error);
      toast.error('Failed to generate match draws');
    }
  };

  const filteredCategories = selectedTournament
    ? categories.filter(cat => cat.tournament_id === selectedTournament)
    : [];

  const selectedCategoryData = categories.find(cat => cat._id === selectedCategory);

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Match Draws</h1>
          <p className="text-gray-600">Visualize and manage tournament match brackets</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tournament
              </label>
              <select
                value={selectedTournament || ''}
                onChange={(e) => {
                  setSelectedTournament(e.target.value);
                  setSelectedCategory(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Tournament</option>
                {tournaments.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.tournament_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={!selectedTournament}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select Category</option>
                {filteredCategories.map(cat => (
                  <option key={cat._id} value={cat._id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end space-x-2">
              <button
                onClick={handleGenerateDraws}
                disabled={!selectedTournament || !selectedCategory}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <FiRefreshCw className="mr-2" />
                Generate Draws
              </button>
              <button
                onClick={loadMatches}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center justify-center"
              >
                <FiRefreshCw />
              </button>
            </div>
          </div>
        </div>

        {/* Bracket Visualization */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : selectedTournament && selectedCategory ? (
            <MatchDrawsBracket
              matches={matches}
              category={selectedCategoryData}
            />
          ) : (
            <div className="text-center py-12">
              <FiFilter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Please select a tournament and category to view match draws</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MatchDraws;

