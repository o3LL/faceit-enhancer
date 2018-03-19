import mem from 'mem'
import camelcaseKeys from 'camelcase-keys'
import { mapTotalStatsMemoized, mapAverageStatsMemoized } from './stats'

const BASE_URL = 'https://api.faceit.com'

async function fetchApi(path) {
  if (typeof path !== 'string') {
    throw new TypeError(`Expected \`path\` to be a string, got ${typeof path}`)
  }

  try {
    const token = localStorage.getItem('token')
    const options = { headers: {} }

    if (token) {
      options.headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${BASE_URL}${path}`, options)

    const json = await response.json()
    const {
      result, // Status for old API(?)
      code, // Status for new API(?)
      payload
    } = json

    if ((result && result !== 'ok') || (code && code !== 'OPERATION-OK')) {
      throw json
    }

    return camelcaseKeys(payload || json, { deep: true })
  } catch (err) {
    console.error(err)

    return null
  }
}

const fetchApiMemoized = mem(fetchApi, {
  maxAge: 600000
})

export const getPlayer = nickname =>
  fetchApiMemoized(`/core/v1/nicknames/${nickname}`)

export const getPlayerStats = async (userId, game, avgPastGames = 20) => {
  if (game !== 'csgo') {
    return null
  }

  let totalStats = await fetchApiMemoized(
    `/stats/api/v1/stats/users/${userId}/games/${game}`
  )

  if (!totalStats || Object.keys(totalStats).length === 0) {
    return null
  }

  totalStats = mapTotalStatsMemoized(totalStats.lifetime)

  let averageStats = await fetchApiMemoized(
    `/stats/api/v1/stats/time/users/${userId}/games/${game}?size=${avgPastGames}`
  )

  if (
    !averageStats ||
    !Array.isArray(averageStats) ||
    averageStats.length === 0
  ) {
    return null
  }

  averageStats = mapAverageStatsMemoized(averageStats)

  return {
    ...totalStats,
    ...averageStats
  }
}

export const getQuickMatch = matchId =>
  fetchApiMemoized(`/core/v1/matches/${matchId}`)

export const getMatch = matchId =>
  fetchApiMemoized(`/match/v1/match/${matchId}`)
