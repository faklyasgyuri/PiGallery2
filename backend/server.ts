import * as _express from "express";
import * as _session from "express-session";
import * as _bodyParser from "body-parser";
import * as _debug from "debug";
import * as _http from "http";
import {PublicRouter} from "./routes/PublicRouter";
import {UserRouter} from "./routes/UserRouter";
import {GalleryRouter} from "./routes/GalleryRouter";
import {AdminRouter} from "./routes/AdminRouter";
import {ErrorRouter} from "./routes/ErrorRouter";
import {SharingRouter} from "./routes/SharingRouter";
import {DatabaseType} from "../common/config/Config";
import {ObjectManagerRepository} from "./model/ObjectManagerRepository";
import {Config} from "./config/Config";


export class Server {

    private debug: any;
    private app: any;
    private server: any;

    constructor() {
        console.log("using config");
        console.log(Config);

        this.debug = _debug("PiGallery2:server");
        this.app = _express();

        this.app.set('view engine', 'ejs');

        if (process.env.DEBUG) {
            let _morgan = require('morgan');
            this.app.use(_morgan('dev'));
        }


        /**
         * Session above all
         */
        this.app.use(_session({
            name: "pigallery2-session",
            secret: 'PiGallery2 secret',
            cookie: {
                maxAge: 60000 * 10,
                httpOnly: false
            },
            resave: true,
            saveUninitialized: false
        }));

        /**
         * Parse parameters in POST
         */
        // for parsing application/json
        this.app.use(_bodyParser.json());


        ObjectManagerRepository.InitMySQLManagers().catch((err) => {
            console.error("Erro during initailizing mysql falling back to memory DB");
            console.log(err);
            Config.setDatabaseType(DatabaseType.memory);
            ObjectManagerRepository.InitMemoryManagers();
        });

        new PublicRouter(this.app);

        new UserRouter(this.app);
        new GalleryRouter(this.app);
        new SharingRouter(this.app);
        new AdminRouter(this.app);

        new ErrorRouter(this.app);


        // Get PORT from environment and store in Express.
        this.app.set('port', Config.Server.port);

        // Create HTTP server.
        this.server = _http.createServer(this.app);

        //Listen on provided PORT, on all network interfaces.
        this.server.listen(Config.Server.port);
        this.server.on('error', this.onError);
        this.server.on('listening', this.onListening);


    }


    /**
     * Event listener for HTTP server "error" event.
     */
    private onError = (error: any) => {
        if (error.syscall !== 'listen') {
            throw error;
        }

        const bind = typeof Config.Server.port === 'string'
            ? 'Pipe ' + Config.Server.port
            : 'Port ' + Config.Server.port;

        // handle specific listen error with friendly messages
        switch (error.code) {
            case 'EACCES':
                console.error(bind + ' requires elevated privileges');
                process.exit(1);
                break;
            case 'EADDRINUSE':
                console.error(bind + ' is already in use');
                process.exit(1);
                break;
            default:
                throw error;
        }
    };


    /**
     * Event listener for HTTP server "listening" event.
     */
    private onListening = () => {
        let addr = this.server.address();
        const bind = typeof addr === 'string'
            ? 'pipe ' + addr
            : 'port ' + addr.port;
        this.debug('Listening on ' + bind);
    };

}


if (process.env.DEBUG) {
    console.log("Running in DEBUG mode");
}

new Server();