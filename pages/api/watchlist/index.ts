// pages/api/favourites/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getSession } from 'next-auth/react';
import { WatchList } from '../../../models/watchlist';
import mongooseConnector from '../../../lib/db/mongooseConnect';

const API_KEY = process.env.NEXT_PUBLIC_MOVIEDB_API_KEY;

const fetchMovieDetails = async (movieId: string) => {
  try {
    const response = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
      params: {
        api_key: API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch movie details for ID: ${movieId}`, error);
    // You might want to handle errors differently here
    return null;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await mongooseConnector();

  const session = await getSession({ req });

  // Check if user is logged in
  if (!session || !session.user) {
    res.status(401).json({ error: 'You must be signed in to access this endpoint.' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const userId = session.user.id;
      const watchlist = await WatchList.find({ user: userId });

      // Fetch the movie details for each favourite
      const movieDetailsPromises = watchlist.map((wat) => fetchMovieDetails(wat.movieId));
      const movieDetails = await Promise.all(movieDetailsPromises);

      // Filter out any null responses (in case of failed requests)
      const validMovieDetails = movieDetails.filter(Boolean);

      res.status(200).json(validMovieDetails);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
