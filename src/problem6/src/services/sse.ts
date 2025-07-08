import {Response} from 'express';
import {SSEMessage, SSEEventType} from '../types';

export class SSEService {
    private clients: Map<string, Response> = new Map();
    private globalClients: Set<Response> = new Set();

    addClient(clientId: string, res: Response): void {

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
        });


        this.sendToClient(res, {
            event: SSEEventType.SYSTEM_MESSAGE,
            data: {message: 'Connected to scoreboard updates', timestamp: new Date().toISOString()},
        });


        this.clients.set(clientId, res);
        this.globalClients.add(res);


        res.on('close', () => {
            this.removeClient(clientId);
        });


        const heartbeat = setInterval(() => {
            if (res.writableEnded) {
                clearInterval(heartbeat);
                return;
            }

            this.sendToClient(res, {
                event: 'heartbeat',
                data: {timestamp: new Date().toISOString()},
            });
        }, 30000);
    }

    removeClient(clientId: string): void {
        const res = this.clients.get(clientId);
        if (res) {
            this.clients.delete(clientId);
            this.globalClients.delete(res);

            if (!res.writableEnded) {
                res.end();
            }
        }
    }

    sendToClient(clientOrId: string | Response, message: SSEMessage): void {
        let res: Response | undefined;

        if (typeof clientOrId === 'string') {
            res = this.clients.get(clientOrId);
        } else {
            res = clientOrId;
        }

        if (!res || res.writableEnded) {
            return;
        }

        try {
            const formattedMessage = this.formatSSEMessage(message);
            res.write(formattedMessage);
        } catch (error) {
            console.error('Error sending SSE message:', error);
            if (typeof clientOrId === 'string') {
                this.removeClient(clientOrId);
            }
        }
    }

    broadcast(message: SSEMessage): void {
        const deadClients: string[] = [];


        for (const [clientId, res] of this.clients.entries()) {
            if (res.writableEnded) {
                deadClients.push(clientId);
                continue;
            }

            try {
                const formattedMessage = this.formatSSEMessage(message);
                res.write(formattedMessage);
            } catch (error) {
                console.error(`Error broadcasting to client ${clientId}:`, error);
                deadClients.push(clientId);
            }
        }


        deadClients.forEach(clientId => this.removeClient(clientId));
    }

    broadcastLeaderboardUpdate(leaderboard: any): void {
        this.broadcast({
            event: SSEEventType.LEADERBOARD_UPDATE,
            data: {
                leaderboard,
                timestamp: new Date().toISOString(),
            },
        });
    }

    broadcastUserScoreUpdate(userScore: any): void {
        this.broadcast({
            event: SSEEventType.USER_SCORE_UPDATE,
            data: {
                userScore,
                timestamp: new Date().toISOString(),
            },
        });
    }

    broadcastSystemMessage(message: string): void {
        this.broadcast({
            event: SSEEventType.SYSTEM_MESSAGE,
            data: {
                message,
                timestamp: new Date().toISOString(),
            },
        });
    }

    getClientCount(): number {
        return this.clients.size;
    }

    closeAllConnections(): void {
        for (const [clientId, res] of this.clients.entries()) {
            if (!res.writableEnded) {
                this.sendToClient(res, {
                    event: SSEEventType.SYSTEM_MESSAGE,
                    data: {message: 'Server shutting down', timestamp: new Date().toISOString()},
                });
                res.end();
            }
        }

        this.clients.clear();
        this.globalClients.clear();
    }

    private formatSSEMessage(message: SSEMessage): string {
        let formatted = '';

        if (message.id) {
            formatted += `id: ${message.id}\n`;
        }

        if (message.event) {
            formatted += `event: ${message.event}\n`;
        }

        if (message.retry) {
            formatted += `retry: ${message.retry}\n`;
        }


        const data = typeof message.data === 'string'
            ? message.data
            : JSON.stringify(message.data);


        const dataLines = data.split('\n');
        dataLines.forEach(line => {
            formatted += `data: ${line}\n`;
        });


        formatted += '\n';

        return formatted;
    }
} 