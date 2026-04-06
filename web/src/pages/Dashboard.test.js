import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Dashboard from './Dashboard';
import { api } from '../lib/api';

// Mock the API
vi.mock('../lib/api', () => ({
  api: {
    getMeetingStats: vi.fn(),
    getAIStats: vi.fn(),
    getWallet: vi.fn(),
    getMeetings: vi.fn()
  }
}));

// Mock PageHeader component
vi.mock('../components/PageHeader', () => ({
  default: ({ title }) => <div data-testid="page-header">{title}</div>
}));

describe('Dashboard', () => {
  const mockData = {
    meetingStats: { total_meetings: 42 },
    aiStats: { total_questions: 156 },
    walletData: { wallet: { balance: 320 } },
    meetingsData: {
      meetings: [
        {
          id: 1,
          title: 'Test Meeting',
          created_at: '2023-10-24T14:20:00Z',
          duration_seconds: 2712, // 45M 12S
          participant_count: 12,
          status: 'active'
        }
      ]
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.getMeetingStats.mockResolvedValue(mockData.meetingStats);
    api.getAIStats.mockResolvedValue(mockData.aiStats);
    api.getWallet.mockResolvedValue(mockData.walletData);
    api.getMeetings.mockResolvedValue(mockData.meetingsData);
  });

  test('displays loading state initially', () => {
    render(<Dashboard />);
    expect(screen.getByText('LOADING_DASHBOARD_DATA...')).toBeInTheDocument();
  });

  test('fetches and displays dashboard data correctly', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(api.getMeetingStats).toHaveBeenCalled();
      expect(api.getAIStats).toHaveBeenCalled();
      expect(api.getWallet).toHaveBeenCalled();
      expect(api.getMeetings).toHaveBeenCalledWith(1, 10);
    });

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument(); // Total meetings
      expect(screen.getByText('156')).toBeInTheDocument(); // Total questions
      expect(screen.getByText('320c')).toBeInTheDocument(); // Coins remaining
    });
  });

  test('handles API errors gracefully', async () => {
    api.getMeetingStats.mockRejectedValue(new Error('API Error'));

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
      expect(screen.getByText('RETRY')).toBeInTheDocument();
    });
  });

  test('formats meeting data correctly', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('TEST MEETING')).toBeInTheDocument();
      expect(screen.getByText('45M 12S')).toBeInTheDocument();
    });
  });

  test('implements polling for live updates', async () => {
    vi.useFakeTimers();

    render(<Dashboard />);

    await waitFor(() => {
      expect(api.getMeetingStats).toHaveBeenCalledTimes(1);
    });

    // Fast-forward 30 seconds
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(api.getMeetingStats).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });
});