import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import AircraftList from './AircraftList';
import ContactsList from './ContactsList';
import NotificationCenter from './NotificationCenter';

interface Message {
  text: string;
  isUser: boolean;
  isSelectiveAction?: boolean;
  selectivePrompts?: any[];
  isPrimaryAction?: boolean;
  primaryActions?: any[];
  isAircraftList?: boolean;
  isContactsList?: boolean;
  isAircraftDetail?: boolean;
  isNotifications?: boolean;
  isNotificationCenter?: boolean;
  aircraft?: any;
  filter?: string;
  contacts?: any[];
  toolOutputId?: string;
  primaryActionLabel?: string;
  selectedContactsCount?: number;
  responseId?: string;
  rating?: number;
  isHtml?: boolean;
}

interface Container {
  id: string;
  toolName: string;
  messages: Message[];
  primarySubcontainer?: Container;
}

interface MessageContainerProps {
  container: Container;
  isCurrentContainer: boolean;
  onSelectiveAction: (action: any, toolName: string) => void;
  onAircraftSelect: (aircraft: any) => void;
  onRating?: (responseId: string, rating: number) => void;
  onChatOpen?: (contact: any) => void;
  selectedStatusFilter?: string | null;
}

export default function MessageContainer({
  container,
  isCurrentContainer,
  onSelectiveAction,
  onAircraftSelect,
  onRating,
  onChatOpen,
  selectedStatusFilter,
}: MessageContainerProps) {
  const [isExpanded, setIsExpanded] = useState(false); // Auto-collapse by default

  const containerClasses = isCurrentContainer
    ? 'space-y-3 my-2 max-h-72' // Current container: no borders, consistent margins
    : // : 'border border-gray-200 rounded-lg p-1 space-y-1 mb-0.5 text-sm'; // Prior container: smaller text, minimal spacing
      'space-y-3 my-2 max-h-72';
  const headerClasses = isCurrentContainer
    ? 'hidden' // Current container: no header
    : 'flex items-center gap-1 py-0.5 cursor-pointer'; // Prior container: arrow on left, minimal padding

  return (
    <div className="space-y-3 my-2 max-h-96 overflow-scroll">
      {/* Collapsible header for prior containers */}
      {/* {!isCurrentContainer && (
        <div className={headerClasses} onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-gray-400" />
          ) : (
            <ChevronRight className="h-3 w-3 text-gray-400" />
          )}
          <h3 className="text-xs font-normal text-gray-500">{container.toolName}</h3>
        </div>
      )} */}

      {/* Messages content */}
      {(isCurrentContainer || isExpanded) && (
        <div className="space-y-3">
          {container.messages.map((message, msgIndex) => (
            <div
              key={msgIndex}
              className={`mb-2 last:mb-0 ${
                message.isUser ? 'text-right' : 'text-left'
              }`}
            >
              {message.isSelectiveAction && message.selectivePrompts ? (
                <div className="space-y-3 w-full">
                  {message.primaryActionLabel && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {message.primaryActionLabel}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {message.selectivePrompts.map((prompt: any) => {
                      // Check if this is the Chat Now button and if contacts are selected
                      const isContactChatButton =
                        prompt.activeEventHandler === 'hasSelectedContacts';
                      const hasSelectedContacts =
                        (message.selectedContactsCount || 0) > 0;
                      const buttonText =
                        isContactChatButton && hasSelectedContacts
                          ? prompt.promptValue
                          : prompt.inactiveLabel || prompt.promptValue;
                      const isDisabled =
                        isContactChatButton && !hasSelectedContacts;

                      // Check if this status filter is currently selected (for FleetSpan highlighting)
                      const isSelectedFilter =
                        container.toolName === 'FleetSpan' &&
                        selectedStatusFilter === prompt.promptValue;

                      return (
                        <Button
                          key={prompt.id}
                          variant="outline"
                          size="sm"
                          className={`btn-enhanced ${
                            prompt.cssClasses ||
                            'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                          } ${
                            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                          } ${
                            isSelectedFilter
                              ? 'ring-2 ring-primary ring-offset-1 shadow-enhanced-md'
                              : ''
                          }`}
                          onClick={() =>
                            !isDisabled &&
                            onSelectiveAction(prompt, container.toolName)
                          }
                          disabled={isDisabled}
                        >
                          {buttonText}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ) : message.isPrimaryAction && message.primaryActions ? (
                <div className="space-y-3 w-full">
                  <p className="text-xs text-muted-foreground mb-2">
                    {message.text}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {message.primaryActions.map(
                      (action: any, index: number) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="btn-enhanced bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                          onClick={() =>
                            console.log('Primary action clicked:', action)
                          }
                        >
                          {action.label}
                        </Button>
                      ),
                    )}
                  </div>
                </div>
              ) : message.isAircraftList ? (
                <div>
                  <AircraftList
                    filter={message.filter}
                    onAircraftSelect={onAircraftSelect}
                    displayMode={
                      message.filter && message.filter.startsWith('N')
                        ? 'single'
                        : 'list'
                    }
                    headerText={message.text}
                  />
                </div>
              ) : message.isContactsList ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {message.text}
                  </p>
                  <ContactsList onSelectiveAction={onSelectiveAction} />
                </div>
              ) : message.isNotifications ? (
                <div className="w-full">
                  <NotificationCenter showInMainWindow={true} />
                </div>
              ) : message.isNotificationCenter ? (
                <div className="w-full">
                  <NotificationCenter
                    showInMainWindow={true}
                    onChatOpen={onChatOpen}
                  />
                </div>
              ) : message.isAircraftDetail ? (
                <div className="card-enhanced p-4 space-y-3">
                  {/* Header with tail number and model */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {message.aircraft.tail_number}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {message.aircraft.model || 'Aircraft Model'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          message.aircraft.status === 'operational'
                            ? 'status-operational'
                            : message.aircraft.status === 'maintenance'
                            ? 'status-maintenance'
                            : message.aircraft.status === 'grounded'
                            ? 'status-grounded'
                            : message.aircraft.status === 'scheduled'
                            ? 'status-scheduled'
                            : message.aircraft.status === 'monitor'
                            ? 'status-monitor'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {message.aircraft.status || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Aircraft details grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <p className="font-medium text-foreground">
                        {message.aircraft.location || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Last Updated:
                      </span>
                      <p className="font-medium text-foreground">
                        {message.aircraft.lastUpdated || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="btn-enhanced flex-1"
                      onClick={() => onAircraftSelect(message.aircraft)}
                    >
                      Select Aircraft
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="btn-enhanced"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ) : message.isHtml ? (
                <div
                  className={`message-bubble ${
                    message.isUser
                      ? 'message-bubble-user'
                      : 'message-bubble-bot'
                  }`}
                  dangerouslySetInnerHTML={{ __html: message.text }}
                />
              ) : (
                <div
                  className={`message-bubble ${
                    message.isUser
                      ? 'message-bubble-user'
                      : 'message-bubble-bot'
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* Rating component for bot messages */}
              {!message.isUser && message.responseId && onRating && (
                <div className="flex justify-start mt-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => onRating(message.responseId!, star)}
                        className={`text-lg transition-colors duration-200 ${
                          message.rating && message.rating >= star
                            ? 'text-yellow-400'
                            : 'text-muted-foreground hover:text-yellow-400'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Render primary subcontainer if it exists */}
      {container.primarySubcontainer && (
        <div className="mt-4 border-l-4 border-blue-200 pl-4">
          <MessageContainer
            container={container.primarySubcontainer}
            isCurrentContainer={true}
            onSelectiveAction={onSelectiveAction}
            onAircraftSelect={onAircraftSelect}
            onRating={onRating}
            selectedStatusFilter={selectedStatusFilter}
          />
        </div>
      )}
    </div>
  );
}
