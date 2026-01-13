// app/dashboard/phone-numbers/page.tsx
'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Plus, Phone, Trash2, Link as LinkIcon, Search, X, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type PhoneNumber = {
  id: string;
  phone_number: string;
  agent_id: string | null;
  monthly_cost: number;
  status: string;
  created_at: string;
};

type Agent = {
  id: string;
  agent_name: string;
  retell_agent_id: string;
};

export default function PhoneNumbersPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [country, setCountry] = useState('US');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [purchasingNumber, setPurchasingNumber] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Delete Confirmation Modal State
  const [numberToRelease, setNumberToRelease] = useState<{ id: string; phoneNumber: string } | null>(null);

  // Fetch phone numbers
  const { data: phoneNumbers = [], isLoading: loadingNumbers } = useQuery({
    queryKey: ['phone-numbers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('client_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PhoneNumber[];
    },
    enabled: !!user?.id,
  });

  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ['agents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id, agent_name, retell_agent_id')
        .eq('client_id', user?.id);

      if (error) throw error;
      return data as Agent[];
    },
    enabled: !!user?.id,
  });

  // Helper to get auth token
  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  // Get country requirements
  const getCountryRequirements = (countryCode: string) => {
    const areaCodeRequired = ['US', 'CA'];
    return areaCodeRequired.includes(countryCode);
  };

  // Search available numbers
  const searchNumbers = async () => {
    if (!areaCode && getCountryRequirements(country)) {
      toast.error('Please enter an area code');
      return;
    }

    setSearching(true);
    setHasSearched(true);
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/phone-numbers/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ areaCode, country }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.unsupportedCountry) {
          toast.error(data.message || 'This country is not currently supported');
        } else {
          toast.error(data.error || 'Search failed');
        }
        setSearching(false);
        return;
      }

      setSearchResults(data.numbers || []);

      if (data.numbers.length === 0) {
        toast.info('No numbers found. Try a different area code or region.');
      }
    } catch (error) {
      toast.error('Failed to search numbers');
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  // Purchase number mutation
  const purchaseMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      setPurchasingNumber(phoneNumber);
      const token = await getAuthToken();
      const response = await fetch('/api/phone-numbers/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phoneNumber }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Purchase failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setPurchasingNumber(null);
    },
  });

  // Link to agent mutation
  const linkMutation = useMutation({
    mutationFn: async ({ numberId, agentId }: { numberId: string; agentId: string | null }) => {
      const token = await getAuthToken();
      const response = await fetch('/api/phone-numbers/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ numberId, agentId }),
      });

      if (!response.ok) throw new Error('Failed to link number');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] });
      toast.success('Number linked successfully!');
    },
    onError: () => {
      toast.error('Failed to link number');
    },
  });

  // Release number mutation
  const releaseMutation = useMutation({
    mutationFn: async (numberId: string) => {
      const token = await getAuthToken();
      const response = await fetch('/api/phone-numbers/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ numberId }),
      });

      if (!response.ok) throw new Error('Failed to release number');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] });
      toast.success('Number released successfully');
    },
    onError: () => {
      toast.error('Failed to release number');
    },
  });

  const handleRelease = (numberId: string, phoneNumber: string) => {
    setNumberToRelease({ id: numberId, phoneNumber });
  };

  const confirmRelease = () => {
    if (numberToRelease) {
      releaseMutation.mutate(numberToRelease.id);
      setNumberToRelease(null);
    }
  };

  if (loadingNumbers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Loading phone numbers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Phone Numbers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your phone numbers and link them to agents
          </p>
        </div>
        <Button onClick={() => setShowBuyModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Buy Number
        </Button>
      </div>

      {/* Phone Numbers List */}
      {phoneNumbers.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No phone numbers yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Purchase your first phone number to start receiving calls for your AI agents
          </p>
          <Button onClick={() => setShowBuyModal(true)} className="gap-2" size="lg">
            <Plus className="w-4 h-4" />
            Buy Your First Number
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {phoneNumbers.map((number) => {
            const linkedAgent = agents.find((a) => a.id === number.agent_id);

            return (
              <Card key={number.id} className="group hover:shadow-md transition-all">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                          <Phone className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-lg font-semibold">{number.phone_number}</span>
                          <Badge
                            variant={number.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {number.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 ml-[52px] text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="font-medium">${number.monthly_cost.toFixed(2)}</span>
                          <span>/month</span>
                        </div>
                        <div className="hidden sm:block w-1 h-1 rounded-full bg-border"></div>
                        {linkedAgent ? (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <LinkIcon className="w-3.5 h-3.5" />
                            <span>Linked to <strong className="text-foreground">{linkedAgent.agent_name}</strong></span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                            <span className="text-amber-600 dark:text-amber-500 font-medium">Not linked to any agent</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 lg:ml-4">
                      {/* Agent Selector */}
                      <div className="flex-1 lg:flex-initial lg:min-w-[200px]">
                        <select
                          value={number.agent_id || ''}
                          onChange={(e) => linkMutation.mutate({
                            numberId: number.id,
                            agentId: e.target.value || null
                          })}
                          disabled={linkMutation.isPending}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring hover:border-primary/50 transition-colors"
                        >
                          <option value="">Select agent...</option>
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.agent_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Release Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRelease(number.id, number.phone_number)}
                        disabled={releaseMutation.isPending}
                        className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/30"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Release</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Buy Number Modal */}
      {showBuyModal && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowBuyModal(false);
            setSearchResults([]);
            setAreaCode('');
          }}
        >
          <Card
            className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-2xl font-bold">Buy Phone Number</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Search and purchase a new phone number ($1.15/month)
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowBuyModal(false);
                  setSearchResults([]);
                  setAreaCode('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Search Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Country</label>
                  <select
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      setAreaCode('');
                      setSearchResults([]);
                      setHasSearched(false);
                    }}
                    className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring hover:border-primary/50 transition-colors"
                  >
                    <optgroup label="North America">
                      <option value="US">🇺🇸 United States</option>
                      <option value="CA">🇨🇦 Canada</option>
                    </optgroup>
                    <optgroup label="Europe">
                      <option value="GB">🇬🇧 United Kingdom</option>
                      <option value="DE">🇩🇪 Germany</option>
                      <option value="FR">🇫🇷 France</option>
                      <option value="CH">🇨🇭 Switzerland</option>
                      <option value="IE">🇮🇪 Ireland</option>
                      <option value="AT">🇦🇹 Austria</option>
                    </optgroup>
                    <optgroup label="Asia Pacific">
                      <option value="AU">🇦🇺 Australia</option>
                      <option value="NZ">🇳🇿 New Zealand</option>
                      <option value="JP">🇯🇵 Japan</option>
                      <option value="PH">🇵🇭 Philippines</option>
                    </optgroup>
                    <optgroup label="Latin America">
                      <option value="MX">🇲🇽 Mexico</option>
                      <option value="BR">🇧🇷 Brazil</option>
                      <option value="AR">🇦🇷 Argentina</option>
                      <option value="CL">🇨🇱 Chile</option>
                      <option value="CO">🇨🇴 Colombia</option>
                    </optgroup>
                    <optgroup label="Other">
                      <option value="IL">🇮🇱 Israel</option>
                      <option value="ZA">🇿🇦 South Africa</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    {getCountryRequirements(country) ? 'Area Code' : 'Area Code (Optional)'}
                    {getCountryRequirements(country) && <span className="text-destructive ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value)}
                    placeholder={
                      country === 'US' ? 'e.g., 212, 415, 646' :
                      country === 'CA' ? 'e.g., 416, 514, 604' :
                      country === 'GB' ? 'e.g., 20 (London), 161 (Manchester)' :
                      country === 'AU' ? 'e.g., 2 (Sydney), 3 (Melbourne)' :
                      'Enter area code or leave empty'
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !searching) {
                        searchNumbers();
                      }
                    }}
                    className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring hover:border-primary/50 transition-colors"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {getCountryRequirements(country)
                      ? 'Area code is required for this country'
                      : 'Leave empty to search all available numbers in this country'}
                  </p>
                </div>

                <Button
                  onClick={searchNumbers}
                  disabled={searching}
                  className="w-full gap-2"
                  size="lg"
                >
                  {searching ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Search Available Numbers
                    </>
                  )}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Available Numbers</h3>
                    <Badge variant="secondary">{searchResults.length} found</Badge>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {searchResults.map((result) => (
                      <div
                        key={result.phoneNumber}
                        className="flex items-center justify-between p-4 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-accent/30 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Phone className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold text-base">{result.phoneNumber}</div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5" />
                              {result.locality}, {result.region}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => purchaseMutation.mutate(result.phoneNumber)}
                          disabled={purchasingNumber !== null}
                          className="gap-2"
                        >
                          {purchasingNumber === result.phoneNumber ? (
                            <>
                              <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Purchase
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results Message */}
              {!searching && hasSearched && searchResults.length === 0 && (
                <div className="p-8 text-center border-2 border-dashed border-border rounded-lg bg-muted/30">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-base mb-2">No numbers found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try a different area code or leave it empty to browse all available numbers
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {numberToRelease && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-md w-full border border-border shadow-lg">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Release Phone Number</h2>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>

              <div className="mb-6 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                <p className="text-sm mb-2 font-medium" style={{ color: 'rgb(220, 38, 38)' }}>
                  You are about to release:
                </p>
                <p className="text-base font-semibold text-foreground">
                  {numberToRelease.phoneNumber}
                </p>
              </div>

              <div className="mb-6">
                <p className="text-sm text-muted-foreground">
                  This will permanently release the phone number from your account and you will stop being charged for it.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-border bg-muted/20">
              <Button
                variant="outline"
                onClick={() => setNumberToRelease(null)}
                disabled={releaseMutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmRelease}
                disabled={releaseMutation.isPending}
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {releaseMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Releasing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Release Number
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
