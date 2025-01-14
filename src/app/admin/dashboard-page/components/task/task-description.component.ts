import {Component, Inject, OnInit} from "@angular/core";
import {ActivatedRoute, Router} from "@angular/router";
import {formatDate} from "@angular/common";
import {FormControl, FormGroup} from "@angular/forms";

import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";

import {
  IArchive,
  IHistoryTask, ITask,
  ITransaction,
  IUAssigned,
} from "../../../../interfaces";
import {ApiTaskService} from "../../../services/api.task.service";
import {ApiBoardService} from "../../../services/api.board.service";
import {TaskService} from "../../../services/task.service";


@Component({
  selector: 'dialog-data-example-dialog',
  templateUrl: './task-description.component.html',
  styleUrls: ['./task-description.component.scss']
})
export class TaskDescriptionComponent implements OnInit {

  public _taskId: number;
  private _boardId: number;
  public _title: string = '';
  public description!: FormControl;

  public showTitle: boolean = false;
  public users: IUAssigned[] = [];
  public assignedUsers: any[] = [];

  public transactionTask: ITransaction[] = [];
  public transactionDialog: boolean = false;

  public ownerStatus!: boolean;
  public userId: null | string = localStorage.getItem('id');

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: any,
    public dialogRef: MatDialogRef<TaskDescriptionComponent>,
    public router: Router,
    public route: ActivatedRoute,
    public apiTaskService: ApiTaskService,
    public taskService: TaskService,
    public apiBoardService: ApiBoardService,
  ) {
    this._taskId = data.item.id;
    this._boardId = this.data.board;
    this._title = data.item.title;
    this.description = new FormControl(this.data.item.description);
  }

  ngOnInit(): void {
    this.allUsersAssigned();
  }

  public allUsersAssigned(): void {
    this.apiTaskService.getAllAssignedUsers$(this._taskId, this._boardId)
      .subscribe((data) => {
        data.allUsers.forEach((user: IUAssigned) => {
          if (user.name !== data.owner.name) {
            this.users = this.users.filter((data: IUAssigned) => data.id !== user.id);
            this.users.push(user);
          }
        });
        data.userAssigned.forEach((user) => {
          if (user.name !== data.owner.name) {
            this.assignedUsers = this.assignedUsers.filter((data: IUAssigned) => data.id !== user.id);
            this.assignedUsers.push(user);
          }
        })
      })
  }

  public close(): void {
    this.dialogRef.close(this.assignedUsers);
  }

  public assignUser(user: IUAssigned): void {
    this.apiTaskService.createAssignedUser$(user.id, this._taskId, this._boardId)
      .subscribe((user: any) => {
        if (!user.exist) {
          this.assignedUsers.push(user);
        }
      })
  }

  public removeAssignedUser(user: IUAssigned): void {
    this.apiTaskService.deleteAssignedUser$(user.id, this._taskId)
      .subscribe((data) => {
        this.assignedUsers = this.assignedUsers.filter((user: IUAssigned) => user.id !== user.id);
      });
  }

  public transaction(): void {
    this.transactionTask.length = 0;
    this.apiTaskService.getHistory$(this._taskId)
      .subscribe((data: IHistoryTask[]) => {
        data.forEach((transaction: IHistoryTask) => {
          if (transaction.transaction === 'creation') {
            this.transactionTask.push({
              id: transaction.id,
              transaction: 'creation',
              data: `Пользователь (${transaction.name_user}) создал задачу.
              время: ${formatDate(transaction.createdAt, 'medium', 'ru', '+0300')}`
            });
          }
          if (transaction.transaction === 'fixing_a_task') {
            this.transactionTask.push({
              id: transaction.id,
              transaction: 'fixing_a_task',
              data: `Пользователь (${transaction.name_user}) изменил задачу.
              время: ${formatDate(transaction.createdAt, 'medium', 'ru', '+0300')}`
            });
          }
          if (transaction.transaction === 'moving') {
            this.transactionTask.push({
              id: transaction.id,
              transaction: 'moving',
              data: `${transaction.name_user} переместил задачу.
              время: ${formatDate(transaction.createdAt, 'medium', 'ru', '+0300')}`
            });
          }
          if (transaction.transaction === 'assigned_users') {
            this.transactionTask.push({
              id: transaction.id,
              transaction: 'assigned_users',
              data: `Пользователь (${transaction.name_user}) назначен на задачу.
              время: ${formatDate(transaction.createdAt, 'medium', 'ru', '+0300')}`
            });
          }
        })
      })

    this.sortHistory(this.transactionTask);
    // // console.log(this.transactionTask);
  }

  public sortHistory(data: any): void {
    console.log(data)
    data.sort((a: IHistoryTask, b: IHistoryTask) => {
      if (a.id < b.id) {
        console.log('a.id < b.id');
        return -1;
      }
      if (a.id > b.id) {
        console.log('a.id > b.id');
        return 1;
      }
      return 0;
    })
  }

  public updateTitle(): void {
    if (this.data.ownerStatus) {
      const titleBoard = document.querySelector('.dialog-column-title');

      if (titleBoard !== null) {
        const childNode = titleBoard.firstChild;

        if (childNode !== null) {
          titleBoard.removeChild(childNode);
          const input = document.createElement('input');
          input.value = this._title;
          titleBoard.append(input);

          input.focus();

          input.addEventListener('blur', () => {
            titleBoard.innerHTML = input.value;
            this._title = input.value;

            this.apiTaskService.updateTitleTask$(this._taskId, this._title)
              .subscribe((data) => {
                this._title = data.title;
                this.dialogRef.close(this._title);
              })
          });
        }
      }
    }
  }

  public showDetails(): void {
    if (this.transactionDialog) {
      this.transactionDialog = false;
    } else {
      this.transaction();
      this.transactionDialog = true;
    }
  }

  public archive(): void {
    const task: IArchive = this.data.item;
    this.apiBoardService.archiveTask$(task.id, task.archive, task.board_id)
      .subscribe((task: ITask) => {
        this.dialogRef.close(task);
      })
  }

  public outTask(): void {
    this.dialogRef.close();

    this.apiTaskService.leaveTask$(this._taskId).subscribe((data: any) => {
    });
  }

  public submit(): void {
    if (this.data.ownerStatus) {
      this.apiTaskService.updateDescriptionTask$(this._taskId, this.description.value)
        .subscribe((task) => {
          this.data.item.description = task.description;
        });
    }
    // console.log('submit');
  }
}

