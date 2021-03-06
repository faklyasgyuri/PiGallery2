import {Component, ViewEncapsulation} from "@angular/core";
import {RouterLink} from "@angular/router";
import {AuthenticationService} from "../model/network/authentication.service";
import {UserDTO} from "../../../common/entities/UserDTO";
import {Config} from "../config/Config";

@Component({
    selector: 'app-frame',
    templateUrl: 'app/frame/frame.component.html',
    providers: [RouterLink],
    encapsulation: ViewEncapsulation.Emulated
})
export class FrameComponent {

    user: UserDTO;
    authenticationRequired:boolean = false;

    constructor(private _authService:AuthenticationService) {
        this.user = this._authService.getUser();
        this.authenticationRequired = Config.Client.authenticationRequired;
    }


    logout() {
        this._authService.logout();
    }
    
}

