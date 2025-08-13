'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { BigMoneyFilter, FilterCriteria } from '@/lib/trading-filters';

interface CustomFilterFormProps {
  isOpen: boolean;
  onClose: () => void;
  filter?: BigMoneyFilter | null;
  onSave: (filter: Omit<BigMoneyFilter, 'id' | 'isCustom' | 'isPreset'>, id?: string) => void;
}

export function CustomFilterForm({ isOpen, onClose, filter, onSave }: CustomFilterFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState<FilterCriteria>({});

  useEffect(() => {
    if (filter) {
      setName(filter.name);
      setDescription(filter.description);
      setCriteria(filter.criteria);
    } else {
      // Reset form for new filter
      setName('');
      setDescription('');
      setCriteria({ side: 'both', moneyness: 'any', aggressiveness: 'any' });
    }
  }, [filter, isOpen]);

  const handleSave = () => {
    const filterData = {
      name,
      description,
      criteria,
      enabled: filter?.enabled ?? true,
    };
    onSave(filterData, filter?.id);
    onClose();
  };

  const handleCriteriaChange = (key: keyof FilterCriteria, value: any) => {
    setCriteria(prev => {
      const newCriteria = { ...prev };
      if (value === '' || value === undefined || value === null || (Array.isArray(value) && value.length === 0) || value === 'any' || value === 'both') {
        delete newCriteria[key];
      } else {
        (newCriteria[key] as any) = value;
      }
      return newCriteria;
    });
  };

  const handleNumberCriteriaChange = (key: keyof FilterCriteria, value: string) => {
    const num = value === '' ? undefined : parseInt(value, 10);
    handleCriteriaChange(key, num);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{filter ? 'Edit Custom Filter' : 'Create Custom Filter'}</DialogTitle>
          <DialogDescription>
            Define your own criteria to receive real-time flow alerts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="e.g., My Bullish Plays" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" placeholder="e.g., Short-term bullish call sweeps" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Premium</Label>
              <Input type="number" placeholder="e.g., 100000" value={criteria.minPremium || ''} onChange={e => handleNumberCriteriaChange('minPremium', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max Premium</Label>
              <Input type="number" placeholder="e.g., 500000" value={criteria.maxPremium || ''} onChange={e => handleNumberCriteriaChange('maxPremium', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min DTE</Label>
              <Input type="number" placeholder="e.g., 0" value={criteria.minDTE || ''} onChange={e => handleNumberCriteriaChange('minDTE', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max DTE</Label>
              <Input type="number" placeholder="e.g., 30" value={criteria.maxDTE || ''} onChange={e => handleNumberCriteriaChange('maxDTE', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Min Size (Contracts)</Label>
            <Input type="number" placeholder="e.g., 100" value={criteria.minSize || ''} onChange={e => handleNumberCriteriaChange('minSize', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Side</Label>
              <Select value={criteria.side || 'both'} onValueChange={(v) => handleCriteriaChange('side', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="ask">Ask</SelectItem>
                  <SelectItem value="bid">Bid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Moneyness</Label>
              <Select value={criteria.moneyness || 'any'} onValueChange={(v) => handleCriteriaChange('moneyness', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="ITM">In the Money (ITM)</SelectItem>
                  <SelectItem value="OTM">Out of the Money (OTM)</SelectItem>
                  <SelectItem value="ATM">At the Money (ATM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Aggressiveness</Label>
              <Select value={criteria.aggressiveness || 'any'} onValueChange={(v) => handleCriteriaChange('aggressiveness', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="sweep">Sweep</SelectItem>
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="split">Split</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contract Types</Label>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="calls"
                    checked={criteria.contractTypes?.includes('call') ?? false}
                    onCheckedChange={(checked) => {
                      const current = criteria.contractTypes || [];
                      const newTypes = checked ? [...current, 'call'] : current.filter(t => t !== 'call');
                      handleCriteriaChange('contractTypes', newTypes);
                    }}
                  />
                  <Label htmlFor="calls">Calls</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="puts"
                    checked={criteria.contractTypes?.includes('put') ?? false}
                    onCheckedChange={(checked) => {
                      const current = criteria.contractTypes || [];
                      const newTypes = checked ? [...current, 'put'] : current.filter(t => t !== 'put');
                      handleCriteriaChange('contractTypes', newTypes);
                    }}
                  />
                  <Label htmlFor="puts">Puts</Label>
                </div>
              </div>
            </div>
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name}>Save Filter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
