import { useState, useEffect } from 'react';
import { tournamentService } from '../services/tournamentService';
import { registrationService } from '../services/registrationService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../components/Layout';

const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const response = await tournamentService.getTournaments({ status: 'Open' });
      setTournaments(response.data || []);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (tournamentId) => {
    if (!isAuthenticated) {
      toast.error('Please login to register');
      return;
    }

    try {
      await registrationService.registerForTournament({
        tournament_id: tournamentId,
        registration_type: 'Individual',
      });
      toast.success('Registration successful!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Available Tournaments</h1>

        {tournaments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 text-lg">No tournaments available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <div key={tournament._id} className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-3">{tournament.tournament_name}</h2>
                <p className="text-gray-600 mb-4">{tournament.description}</p>
                
                <div className="space-y-2 mb-4">
                  <p className="text-sm">
                    <span className="font-medium">Start:</span>{' '}
                    {format(new Date(tournament.start_date), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">End:</span>{' '}
                    {format(new Date(tournament.end_date), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Venue:</span> {tournament.venue}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Entry Fee:</span> Rs {tournament.entry_fee_individual}
                  </p>
                </div>

                <button
                  onClick={() => handleRegister(tournament._id)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
                >
                  Register Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tournaments;

