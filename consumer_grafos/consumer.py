import pika
import mysql.connector
import json

def process_message(body):
    data = json.loads(body)
    # Exemplo: processar dados de grafos e salvar no banco
    print("Processando dados de grafo:", data)
    # Aqui você faria operações no banco, por exemplo inserir nós ou arestas

def main():
    connection = pika.BlockingConnection(pika.ConnectionParameters(host='rabbitmq'))
    channel = connection.channel()

    channel.queue_declare(queue='grafos_queue')

    def callback(ch, method, properties, body):
        print("Mensagem recebida")
        process_message(body)
        ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_consume(queue='grafos_queue', on_message_callback=callback)

    print('Esperando mensagens na fila grafos_queue. Para sair, pressione CTRL+C')
    channel.start_consuming()

if __name__ == '__main__':
    main()
