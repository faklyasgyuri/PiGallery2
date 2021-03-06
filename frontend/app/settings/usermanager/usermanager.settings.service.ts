import {Injectable} from "@angular/core";
import {UserDTO} from "../../../../common/entities/UserDTO";
import {NetworkService} from "../../model/network/network.service";
import {Message} from "../../../../common/entities/Message";

@Injectable()
export class UserManagerSettingsService {


    constructor(private _networkService:NetworkService) {
    }

    public createUser(user: UserDTO): Promise<Message<string>> {
        return this._networkService.putJson("/user", {newUser: user});
    }


    public getUsers(): Promise<Message<Array<UserDTO>>> {
        return this._networkService.getJson("/user/list");
    }


    public deleteUser(user: UserDTO) {
        return this._networkService.deleteJson("/user/" + user.id);
    }

    public updateRole(user: UserDTO) {
        return this._networkService.postJson("/user/" + user.id + "/role", {newRole: user.role});
    }
}
