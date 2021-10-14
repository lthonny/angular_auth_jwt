import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Router} from "@angular/router";

import {catchError, tap} from "rxjs/operators";
import {BehaviorSubject, Observable} from "rxjs";

import {IAuthResponse, ISingIn, ISingUp} from '../interfaces';

import {ErrorService} from "./error.service";
import {TokenService} from "./token.service";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private nameUser: string = '';
  private _isAuthorized = new BehaviorSubject<boolean>(false);

  get isAuthorized$(): Observable<boolean> {
    return this._isAuthorized.asObservable();
  }

  get isAuthorized(): boolean {
    return this._isAuthorized.getValue();
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private error: ErrorService,
    private tokenService: TokenService
  ) {
    this.isAuth$()
      .subscribe(() => {
        this._isAuthorized.next(true);
      }, () => {
        this._isAuthorized.next(false);
      })
  }

  public isAuth$(): Observable<undefined> {
    const accessToken = this.tokenService.getToken();
    return this.http.get<undefined>(`/api/isauth`, {headers: {Authorization: `Bearer ${accessToken}`}})
  }

  public singUp$(user: ISingUp): Observable<IAuthResponse> {
    return this.http.post<IAuthResponse>(`/api/signup`, user);
  }

  public singIn$(user: ISingIn): Observable<IAuthResponse> {
    return this.http.post<IAuthResponse>(`/api/login`, user)
      .pipe(
        catchError(err => this.error.handleError(err)),
        tap((data) => this.login$(data))
      )
  }

  public login$(data: IAuthResponse) {
    this.setStorage(data.user.id, data.user.name, data.accessToken);
    this._isAuthorized.next(true);
  }

  public logout$(): Observable<string> {
    this._isAuthorized.next(false);
    this.removeStorage('id', this.nameUser, 'token');
    return this.http.post<string>(`/api/logout`, {});
  }

  private setStorage(id: string, name: string, token: string) {
    localStorage.setItem('id', id);
    localStorage.setItem('name', name);
    localStorage.setItem('token', token);
  }

  private removeStorage(id: string, name: string, token: string) {
    localStorage.removeItem(id);
    localStorage.removeItem(name);
    localStorage.removeItem(token);
  }
}