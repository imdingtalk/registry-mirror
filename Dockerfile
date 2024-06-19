FROM docker:26.1.2
WORKDIR /app
COPY  . /app
RUN chmod +x ./start.sh
ENTRYPOINT ["./start.sh"]