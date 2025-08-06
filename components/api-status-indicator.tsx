
'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';

interface APIStatusIndicatorProps {
  status: 'connected' | 'error' | 'connecting' | 'mock_data';
  className?: string;
}

export function APIStatusIndicator({ status, className }: APIStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          text: 'Connected',
          description: 'Successfully connected to Unusual Whales API with live data',
          color: 'text-green-600'
        };
      case 'error':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          text: 'API Error',
          description: 'Failed to connect to Unusual Whales API. Check your API key in .env file',
          color: 'text-red-600'
        };
      case 'connecting':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          text: 'Connecting',
          description: 'Attempting to connect to Unusual Whales API',
          color: 'text-yellow-600'
        };
      case 'mock_data':
        return {
          variant: 'secondary' as const,
          icon: AlertCircle,
          text: 'Mock Data',
          description: 'Using mock data. Add your Unusual Whales API key to .env file for live data',
          color: 'text-orange-600'
        };
      default:
        return {
          variant: 'secondary' as const,
          icon: AlertCircle,
          text: 'Unknown',
          description: 'API status unknown',
          color: 'text-gray-600'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className={`${className}`}>
            <Icon className={`h-3 w-3 mr-1 ${config.color}`} />
            {config.text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
