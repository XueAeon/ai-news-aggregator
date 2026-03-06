import { useEffect, startTransition } from 'react';

import Typography from '@mui/material/Typography';

import { useRouter, useSearchParams } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';
import { useGetConversation, useGetConversations } from 'src/actions/chat';

import { EmptyContent } from 'src/components/empty-content';

import { ChatLayout } from 'src/sections/chat/layout';
import { ChatRoom } from 'src/sections/chat/chat-room';
import { ChatMessageList } from 'src/sections/chat/chat-message-list';
import { ChatHeaderDetail } from 'src/sections/chat/chat-header-detail';
import { useCollapseNav } from 'src/sections/chat/hooks/use-collapse-nav';

import { useMockedUser } from 'src/auth/hooks';

import { UserChatNav } from '../user-chat-nav';

export function UserChatHistoryView({ basePath, userId }) {
  const router = useRouter();

  const { user } = useMockedUser();

  const searchParams = useSearchParams();
  const selectedConversationId = searchParams.get('id') || '';

  const { conversations, conversationsLoading } = useGetConversations(userId);
  const { conversation, conversationError, conversationLoading } =
    useGetConversation(selectedConversationId, userId);

  const roomNav = useCollapseNav();
  const conversationsNav = useCollapseNav();

  useEffect(() => {
    if (!selectedConversationId) {
      startTransition(() => {
        router.push(basePath);
      });
    }
  }, [basePath, conversationError, router, selectedConversationId]);

  const filteredParticipants = conversation
    ? conversation.participants.filter((participant) => participant.id !== `${user?.id}`)
    : [];

  return (
    <DashboardContent
      maxWidth={false}
      sx={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column' }}
    >
      <ChatLayout
        slots={{
          header: selectedConversationId ? (
            <ChatHeaderDetail
              collapseNav={roomNav}
              participants={filteredParticipants}
              loading={conversationLoading}
            />
          ) : (
            <Typography sx={{ px: 3, py: 2, fontWeight: 600 }}>Chat History</Typography>
          ),
          nav: (
            <UserChatNav
              userId={userId}
              basePath={basePath}
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              collapseNav={conversationsNav}
              loading={conversationsLoading}
            />
          ),
          main: (
            <>
              {selectedConversationId ? (
                conversationError ? (
                  <EmptyContent
                    title={conversationError.message}
                    imgUrl={`${CONFIG.assetsDir}/assets/icons/empty/ic-chat-empty.svg`}
                  />
                ) : (
                  <ChatMessageList
                    messages={conversation?.messages ?? []}
                    participants={filteredParticipants}
                    loading={conversationLoading}
                  />
                )
              ) : (
                <EmptyContent
                  title="No conversation selected"
                  description="Choose one conversation from the left list."
                  imgUrl={`${CONFIG.assetsDir}/assets/icons/empty/ic-chat-active.svg`}
                />
              )}
            </>
          ),
          details: conversation && selectedConversationId && (
            <ChatRoom
              collapseNav={roomNav}
              participants={filteredParticipants}
              loading={conversationLoading}
              messages={conversation?.messages ?? []}
            />
          ),
        }}
      />
    </DashboardContent>
  );
}
