#!/usr/bin/env node

/**
 * Hacker News Scraper
 *
 * Fetches and parses submissions from Hacker News front page.
 * Usage: node browser-hn-scraper.js [--limit <number>]
 */

import { Yargs } from 'yargs';
import * as cheerio from 'cheerio';
import { handleError } from './utils/error-handler.js';

export const command = 'hn-scraper [limit]';
export const description = 'Scrape Hacker News stories';

interface HnScraperArgs {
  limit?: number;
}

export const builder = (yargs: Yargs) => {
  return yargs.positional('limit', {
    type: 'number',
    description: 'Maximum number of submissions to return',
    default: 30
  });
};

/**
 * Scrapes Hacker News front page
 * @param {number} limit - Maximum number of submissions to return (default: 30)
 * @returns {Promise<Array>} Array of submission objects
 */
async function scrapeHackerNews(limit = 30) {
  const url = 'https://news.ycombinator.com';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const submissions = [];

    // Each submission has class 'athing'
    $('.athing').each((index, element) => {
      if (submissions.length >= limit) return false; // Stop when limit reached

      const $element = $(element);
      const id = $element.attr('id');

      // Get title and URL from titleline
      const $titleLine = $element.find('.titleline > a').first();
      const title = $titleLine.text().trim();
      const url = $titleLine.attr('href');

      // Get the next row which contains metadata (points, author, comments)
      const $metadataRow = $element.next();
      const $subtext = $metadataRow.find('.subtext');

      // Get points
      const $score = $subtext.find(`#score_${id}`);
      const pointsText = $score.text();
      const points = pointsText ? parseInt(pointsText.match(/\d+/)?.[0] || '0') : 0;

      // Get author
      const author = $subtext.find('.hnuser').text().trim();

      // Get time
      const time = $subtext.find('.age').attr('title') || $subtext.find('.age').text().trim();

      // Get comments count
      const $commentsLink = $subtext.find('a').last();
      const commentsText = $commentsLink.text();
      let commentsCount = 0;

      if (commentsText.includes('comment')) {
        const match = commentsText.match(/(\d+)/);
        commentsCount = match ? parseInt(match[0]) : 0;
      }

      submissions.push({
        id,
        title,
        url,
        points,
        author,
        time,
        comments: commentsCount,
        hnUrl: `https://news.ycombinator.com/item?id=${id}`
      });
    });

    return submissions;
  } catch (error) {
    console.error('Error scraping Hacker News:', error.message);
    throw error;
  }
}

export const handler = async (argv: HnScraperArgs): Promise<void> => {
  try {
    const submissions = await scrapeHackerNews(argv.limit);
    console.log(JSON.stringify(submissions, null, 2));
    console.error(`\n✓ Scraped ${submissions.length} submissions`);
  } catch (error) {
    handleError(error, 'Scraping Hacker News');
  }
};

export const hnScraper = async (limit: number = 30) => handler({ limit });
