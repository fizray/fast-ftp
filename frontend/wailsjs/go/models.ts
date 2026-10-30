export namespace models {
	
	export class ConnectionProfile {
	    id: string;
	    name: string;
	    host: string;
	    port: number;
	    user: string;
	    authType: string;
	    keyPath?: string;
	    encryptedPassword?: string;
	    encryptedPassphrase?: string;
	    rememberPassword: boolean;
	    source: string;
	    syncToSSHConfig?: boolean;
	    group?: string;
	    colorBadge?: string;
	
	    static createFrom(source: any = {}) {
	        return new ConnectionProfile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.user = source["user"];
	        this.authType = source["authType"];
	        this.keyPath = source["keyPath"];
	        this.encryptedPassword = source["encryptedPassword"];
	        this.encryptedPassphrase = source["encryptedPassphrase"];
	        this.rememberPassword = source["rememberPassword"];
	        this.source = source["source"];
	        this.syncToSSHConfig = source["syncToSSHConfig"];
	        this.group = source["group"];
	        this.colorBadge = source["colorBadge"];
	    }
	}
	export class ConnectRequest {
	    profile: ConnectionProfile;
	    password?: string;
	    passphrase?: string;
	
	    static createFrom(source: any = {}) {
	        return new ConnectRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.profile = this.convertValues(source["profile"], ConnectionProfile);
	        this.password = source["password"];
	        this.passphrase = source["passphrase"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class DriveInfo {
	    letter: string;
	    label: string;
	
	    static createFrom(source: any = {}) {
	        return new DriveInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.letter = source["letter"];
	        this.label = source["label"];
	    }
	}
	export class FileItem {
	    name: string;
	    path: string;
	    size: number;
	    mode: string;
	    octalMode: string;
	    numericMode: number;
	    isDir: boolean;
	    isSymlink: boolean;
	    linkTarget?: string;
	    // Go type: time
	    modTime: any;
	    extension: string;
	    isHidden: boolean;
	
	    static createFrom(source: any = {}) {
	        return new FileItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.size = source["size"];
	        this.mode = source["mode"];
	        this.octalMode = source["octalMode"];
	        this.numericMode = source["numericMode"];
	        this.isDir = source["isDir"];
	        this.isSymlink = source["isSymlink"];
	        this.linkTarget = source["linkTarget"];
	        this.modTime = this.convertValues(source["modTime"], null);
	        this.extension = source["extension"];
	        this.isHidden = source["isHidden"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SSHKeyInfo {
	    name: string;
	    path: string;
	    type: string;
	    isPrivate: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SSHKeyInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.type = source["type"];
	        this.isPrivate = source["isPrivate"];
	    }
	}

}

